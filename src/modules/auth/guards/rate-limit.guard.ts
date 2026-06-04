import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from '@nestjs/platform-express';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception';

interface WindowEntry {
  timestamps: number[];
  lastSeen: number;
}

/**
 * RateLimitGuard — sliding-window rate limiter.
 *
 * KNOWN LIMITATIONS (see ADR-042):
 *  - State is stored in process memory. In a horizontally-scaled deployment
 *    this guard must be replaced with a shared-store implementation
 *    (e.g. Redis via @nestjs/throttler with a Redis store) so that all
 *    instances share the same counters.
 *  - Rate limiting is applied per IP **and** per username/email (when present)
 *    to mitigate credential-stuffing from distributed IPs, but a dedicated
 *    WAF or reverse-proxy layer is still recommended for production.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  /**
   * In-process store — intentionally scoped so that the comment above
   * stays co-located with the declaration that carries the risk.
   *
   * TODO(infra): replace with Redis-backed store before horizontal scale-out.
   */
  private readonly store = new Map<string, WindowEntry>();

  private readonly maxAttempts: number;
  private readonly windowMs: number;

  /**
   * Interval (ms) between store-eviction sweeps.
   * Entries that have not been accessed for longer than one full window are
   * removed to prevent unbounded memory growth / memory-leak under load.
   */
  private readonly evictionIntervalMs: number;

  constructor(private readonly configService: ConfigService) {
    const maxAttempts = this.configService.get<number>('RATE_LIMIT_MAX_ATTEMPTS');
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS');

    if (maxAttempts === undefined || maxAttempts === null) {
      throw new Error(
        'RATE_LIMIT_MAX_ATTEMPTS is not configured. ' +
          'Set an explicit value in your environment configuration.',
      );
    }
    if (windowMs === undefined || windowMs === null) {
      throw new Error(
        'RATE_LIMIT_WINDOW_MS is not configured. ' +
          'Set an explicit value in your environment configuration.',
      );
    }

    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.evictionIntervalMs = this.windowMs * 2;

    // Periodic eviction of stale entries to bound memory usage.
    const evictionTimer = setInterval(
      () => this.evictStaleEntries(),
      this.evictionIntervalMs,
    );
    // Allow the Node.js event loop to exit even if this timer is still active.
    if (evictionTimer.unref) {
      evictionTimer.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const ip = this.resolveClientIp(request);
    const username = this.resolveUsername(request);

    const now = Date.now();

    // Always check and record the IP-based key.
    this.checkAndRecord(ip, now);

    // Additionally check and record a per-username key when a username is
    // present, so that credential-stuffing from many IPs against a single
    // account is also rate-limited.
    if (username) {
      this.checkAndRecord(`user:${username}`, now);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the real client IP address.
   *
   * `request.ip` honours Express's `trust proxy` setting when configured,
   * which means it already handles the X-Forwarded-For header safely.
   * `request.socket.remoteAddress` is used as a hard fallback for the rare
   * case where the request object is not a fully initialised Express request.
   *
   * IMPORTANT: ensure `trust proxy` is configured in your Express/NestJS
   * bootstrap when the application runs behind a reverse proxy, otherwise
   * `request.ip` will reflect the proxy's address rather than the client's.
   */
  private resolveClientIp(request: Request): string {
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  /**
   * Extract a normalised username/email from the request body, if present.
   * Returns undefined when no username can be determined so that callers can
   * skip the per-user check gracefully.
   */
  private resolveUsername(request: Request): string | undefined {
    const body = (request as Request & { body?: Record<string, unknown> }).body;
    if (!body) return undefined;

    const raw = body['username'] ?? body['email'];
    if (typeof raw !== 'string' || raw.trim() === '') return undefined;

    // Normalise to lower-case to prevent trivial bypass via case variation.
    return raw.trim().toLowerCase();
  }

  /**
   * Core sliding-window check.
   * Throws TooManyRequestsException when the key has exceeded maxAttempts
   * within the current window; otherwise records the current timestamp.
   */
  private checkAndRecord(key: string, now: number): void {
    const windowStart = now - this.windowMs;

    if (!this.store.has(key)) {
      this.store.set(key, { timestamps: [], lastSeen: now });
    }

    const entry = this.store.get(key)!;
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    entry.lastSeen = now;

    if (entry.timestamps.length >= this.maxAttempts) {
      throw new TooManyRequestsException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.timestamps.push(now);
  }

  /**
   * Remove entries that have not been accessed for at least one full window.
   * Called on a periodic timer so that memory is reclaimed for IPs / usernames
   * that stop sending requests (including during a DDoS that later subsides).
   */
  private evictStaleEntries(): void {
    const staleThreshold = Date.now() - this.windowMs;
    for (const [key, entry] of this.store) {
      if (entry.lastSeen < staleThreshold) {
        this.store.delete(key);
      }
    }
  }
}