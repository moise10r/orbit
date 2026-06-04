import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly requests = new Map<string, number[]>();
  private pruneInterval: ReturnType<typeof setInterval>;

  constructor(private readonly configService: ConfigService) {
    this.limit = this.configService.get<number>('RATE_LIMIT_MAX', 10);
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000);

    this.pruneInterval = setInterval(() => this.prune(), this.windowMs);
    if (this.pruneInterval.unref) {
      this.pruneInterval.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const ip = req.ip || req.connection?.remoteAddress;

    if (!ip) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = (this.requests.get(ip) || []).filter(t => t > windowStart);

    if (timestamps.length >= this.limit) {
      const oldestTimestamp = timestamps[0];
      const retryAfterMs = oldestTimestamp + this.windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);

    return true;
  }

  private prune(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.requests.entries()) {
      const active = timestamps.filter(t => t > windowStart);
      if (active.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, active);
      }
    }
  }
}