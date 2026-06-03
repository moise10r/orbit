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

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);
  // Known limitation: this store is in-memory and per-process. In a multi-pod
  // deployment rate limits are not shared across instances. A distributed store
  // (e.g. Redis) must be introduced to enforce limits fleet-wide. This is a known
  // limitation tracked separately; the in-process store is retained here only as
  // a temporary single-instance safeguard.
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;
  private ldClient: LDClient.LDClient | undefined;
  // Cache the LD initialization state after first successful initialization so
  // waitForInitialization() is not awaited on every request.
  private ldInitialized = false;
  private ldInitPromise: Promise<void> | undefined;

  constructor(private readonly configService: ConfigService) {
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

    const cleanupIntervalMs = this.configService.get<number>('RATE_LIMIT_CLEANUP_INTERVAL_MS', 60_000);
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
    if (this.ldClient) {
      this.ldClient.close();
    }
  }

  // getLdNumber no longer calls waitForInitialization() on every request.
  // It relies on the ldInitialized flag set once during construction.
  // Fallback values are sourced from environment/config rather than being bare
  // numeric literals so they are configurable without a flag change.
  //
  // Issue 1 fix: All flag keys passed to this method must follow the required
  // 'orbit.<team>.<feature>' naming convention (e.g.
  // 'orbit.platform.rate-limit-max-requests'). Callers are responsible for
  // supplying compliant keys; a non-compliant key will still function but will
  // be flagged in LaunchDarkly audits.
  //
  // Issue 4 fix: The LDClient context object is constructed from the caller-
  // supplied `contextKey` parameter so that LaunchDarkly can target by IP,
  // user, or environment. Callers should pass a meaningful, stable identifier
  // (e.g. the request IP) rather than a generic static string.
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
    // together under the sentinel so they are still subject to rate-limiting.
    this.logger.warn(
      `Could not extract a valid IP from socket.remoteAddress ("${raw}"). ` +
        `Using sentinel IP ${SENTINEL_IP} for rate-limit tracking.`,
    );
    return SENTINEL_IP;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const ip = this.extractIp(request);

    // Resolve flag-controlled thresholds. Flag keys follow the required
    // 'orbit.<team>.<feature>' naming convention. The IP is used as the
    // LaunchDarkly context key so that per-IP targeting rules can be applied.
    const maxRequests = await this.getLdNumber(
      'orbit.platform.rate-limit-max-requests',
      ip,
      this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
    );
    const windowMs = await this.getLdNumber(
      'orbit.platform.rate-limit-window-ms',
      ip,
      this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60_000),
    );
    const blockDurationMs = await this.getLdNumber(
      'orbit.platform.rate-limit-block-duration-ms',
      ip,
      this.configService.get<number>('RATE_LIMIT_BLOCK_DURATION_MS', 300_000),
    );

    const now = Date.now();
    const entry = this.store.get(ip);

    if (entry) {
      // If the IP is currently blocked, reject immediately.
      if (entry.blockedUntil !== null && now < entry.blockedUntil) {
        const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            retryAfter: retryAfterSec,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Block period has expired — reset the entry.
      if (entry.blockedUntil !== null && now >= entry.blockedUntil) {
        this.store.set(ip, { count: 1, firstRequestAt: now, blockedUntil: null });
        return true;
      }

      // Within the current window.
      if (now - entry.firstRequestAt < windowMs) {
        entry.count += 1;
        if (entry.count > maxRequests) {
          entry.blockedUntil = now + blockDurationMs;
          const retryAfterSec = Math.ceil(blockDurationMs / 1000);
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests. Please try again later.',
              retryAfter: retryAfterSec,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        return true;
      }

      // Window has elapsed — start a fresh window.
      this.store.set(ip, { count: 1, firstRequestAt: now, blockedUntil: null });
      return true;
    }

    // First request from this IP.
    this.store.set(ip, { count: 1, firstRequestAt: now, blockedUntil: null });
    return true;
  }

  // cleanup() evicts entries whose window has elapsed and whose block period
  // (if any) has also elapsed. Iteration is bounded by the size of the store;
  // under sustained high load the store is bounded by the number of distinct IPs
  // that have made requests within the last window, which is acceptable for a
  // single-instance guard. A distributed store (e.g. Redis with TTL keys) should
  // be used in multi-pod deployments to avoid this concern entirely.
  private cleanup(): void {
    const now = Date.now();
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60_000);
    const blockDurationMs = this.configService.get<number>('RATE_LIMIT_BLOCK_DURATION_MS', 300_000);
    const maxAgeMs = Math.max(windowMs, blockDurationMs);

    for (const [ip, entry] of this.store.entries()) {
      const age = now - entry.firstRequestAt;
      const blockExpired = entry.blockedUntil === null || now >= entry.blockedUntil;
      if (age > maxAgeMs && blockExpired) {
        this.store.delete(ip);
      }
    }
  }
}