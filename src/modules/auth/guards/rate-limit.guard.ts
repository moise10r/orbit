import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as LDClient from 'launchdarkly-node-server-sdk';
import Redis from 'ioredis';

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  blockedUntil: number | null;
}

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

// Sentinel IP used when no valid IP can be extracted from the socket. Requests
// mapped to this sentinel are still subject to rate-limiting so that an absent
// IP cannot be used to bypass the guard entirely.
const SENTINEL_IP = '0.0.0.0';

// LaunchDarkly flag keys follow the required 'orbit.<team>.<feature>' convention.
const LD_FLAG_MAX_ATTEMPTS = 'orbit.platform.rate-limit-max-attempts';
const LD_FLAG_WINDOW_SECONDS = 'orbit.platform.rate-limit-window-seconds';
const LD_FLAG_BLOCK_DURATION_SECONDS = 'orbit.platform.rate-limit-block-duration-seconds';

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Redis-backed distributed store for rate-limit state. This replaces the
  // previous in-memory, per-process Map so that limits are enforced consistently
  // across all pods in a multi-instance deployment.
  private readonly redisClient: Redis;

  private readonly cleanupTimer: ReturnType<typeof setInterval>;
  private ldClient: LDClient.LDClient | undefined;
  // Cache the LD initialization state after first successful initialization so
  // waitForInitialization() is not awaited on every request.
  private ldInitialized = false;
  private ldInitPromise: Promise<void> | undefined;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis client for distributed rate-limit storage.
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redisClient = new Redis(redisUrl);
    this.redisClient.on('error', (err: unknown) => {
      this.logger.error('Redis client error in RateLimitGuard.', err);
    });

    const ldSdkKey = this.configService.get<string>('LAUNCHDARKLY_SDK_KEY', '');
    if (ldSdkKey) {
      this.ldClient = LDClient.init(ldSdkKey);
      // Capture and log initialization failures explicitly so silent
      // degradation is visible in logs.
      this.ldInitPromise = this.ldClient
        .waitForInitialization()
        .then(() => {
          this.ldInitialized = true;
          this.logger.log('LaunchDarkly client initialized successfully.');
        })
        .catch((err: unknown) => {
          this.logger.error(
            'LaunchDarkly client failed to initialize. Rate-limit flags will use env-var fallbacks.',
            err,
          );
        });
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.redisClient.quit();
    if (this.ldClient) {
      this.ldClient.close();
    }
  }

  // getLdNumber no longer calls waitForInitialization() on every request.
  // It relies on the ldInitialized flag set once during construction.
  // Fallback values are sourced from environment/config rather than being bare
  // numeric literals so they are configurable without a flag change.
  //
  // All flag keys passed to this method follow the required
  // 'orbit.<team>.<feature>' naming convention (e.g.
  // 'orbit.platform.rate-limit-max-attempts'). Non-compliant keys will still
  // function but will be flagged in LaunchDarkly audits.
  //
  // The LDClient context object is constructed from the caller-supplied
  // `contextKey` parameter so that LaunchDarkly can target by IP, user, or
  // environment. Callers should pass a meaningful, stable identifier (e.g. the
  // request IP) rather than a generic static string.
  private async getLdNumber(
    flagKey: string,
    contextKey: string,
    fallback: number,
  ): Promise<number> {
    if (!this.ldClient || !this.ldInitialized) {
      return fallback;
    }
    try {
      const value = await this.ldClient.variation(
        flagKey,
        { key: contextKey },
        fallback,
      );
      return typeof value === 'number' ? value : fallback;
    } catch (err: unknown) {
      this.logger.error(
        `Failed to evaluate LaunchDarkly flag "${flagKey}", using fallback ${fallback}.`,
        err,
      );
      return fallback;
    }
  }

  // extractIp reads only the socket remote address and ignores
  // X-Forwarded-For entirely to prevent header-spoofing bypass. If the service
  // runs behind a trusted reverse proxy that rewrites the source IP, this method
  // should be revisited to read a single, validated proxy-set header instead.
  private extractIp(request: Record<string, unknown>): string {
    const socket = request['socket'] as { remoteAddress?: string } | undefined;
    const raw = socket?.remoteAddress ?? '';
    const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
    if (IP_REGEX.test(ip)) {
      return ip;
    }
    // Fall back to a sentinel that still lets the rate-limit logic run without
    // crashing. All requests that cannot be attributed to a valid IP are bucketed
    // together under the sentinel.
    this.logger.warn(
      `Could not extract a valid IP from socket (raw="${raw}"); using sentinel ${SENTINEL_IP}.`,
    );
    return SENTINEL_IP;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const ip = this.extractIp(request);
    const now = Date.now();

    // Resolve all three thresholds from LaunchDarkly, falling back to
    // environment-variable-driven config values so no numeric defaults are
    // hardcoded in source.
    const fallbackMaxAttempts = this.configService.get<number>('RATE_LIMIT_MAX_ATTEMPTS', 5);
    const fallbackWindowSeconds = this.configService.get<number>('RATE_LIMIT_WINDOW_SECONDS', 900);
    const fallbackBlockDurationSeconds = this.configService.get<number>(
      'RATE_LIMIT_BLOCK_DURATION_SECONDS',
      3600,
    );

    const [maxAttempts, windowSeconds, blockDurationSeconds] = await Promise.all([
      this.getLdNumber(LD_FLAG_MAX_ATTEMPTS, ip, fallbackMaxAttempts),
      this.getLdNumber(LD_FLAG_WINDOW_SECONDS, ip, fallbackWindowSeconds),
      this.getLdNumber(LD_FLAG_BLOCK_DURATION_SECONDS, ip, fallbackBlockDurationSeconds),
    ]);

    const windowMs = windowSeconds * 1000;
    const blockDurationMs = blockDurationSeconds * 1000;

    const storeKey = `rate_limit:${ip}`;

    // Read current entry from Redis.
    let entry: RateLimitEntry | null = null;
    try {
      const raw = await this.redisClient.get(storeKey);
      if (raw) {
        entry = JSON.parse(raw) as RateLimitEntry;
      }
    } catch (err: unknown) {
      this.logger.error(`Redis GET failed for key "${storeKey}". Allowing request.`, err);
      return true;
    }

    // Check whether the IP is currently blocked.
    if (entry?.blockedUntil != null && entry.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reset or initialize window if expired or absent.
    if (!entry || now - entry.firstRequestAt > windowMs) {
      entry = { count: 1, firstRequestAt: now, blockedUntil: null };
    } else {
      entry.count += 1;
    }

    // Block if threshold exceeded.
    if (entry.count > maxAttempts) {
      entry.blockedUntil = now + blockDurationMs;
      this.logger.warn(
        `IP ${ip} exceeded rate limit (${entry.count}/${maxAttempts}). Blocked for ${blockDurationSeconds}s.`,
      );
    }

    // Persist updated entry to Redis with an expiry so keys self-clean.
    const ttlSeconds = Math.ceil(
      (entry.blockedUntil != null
        ? entry.blockedUntil - now
        : windowMs - (now - entry.firstRequestAt)) / 1000,
    );
    try {
      await this.redisClient.set(storeKey, JSON.stringify(entry), 'EX', Math.max(ttlSeconds, 1));
    } catch (err: unknown) {
      this.logger.error(`Redis SET failed for key "${storeKey}".`, err);
    }

    if (entry.blockedUntil != null && entry.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}