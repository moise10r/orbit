import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface WindowEntry {
  timestamps: number[];
  lastSeen: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, WindowEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = this.configService.get<number>('RATE_LIMIT_MAX_ATTEMPTS', 10);
    this.windowMs    = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60_000);

    const evictionTimer = setInterval(() => this.evictStaleEntries(), this.windowMs * 2);
    if (evictionTimer.unref) evictionTimer.unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();

    this.checkAndRecord(ip, now);

    const body = (request as Request & { body?: Record<string, unknown> }).body;
    const username = typeof body?.['email'] === 'string' ? body['email'].toLowerCase() : undefined;
    if (username) this.checkAndRecord(`user:${username}`, now);

    return true;
  }

  private checkAndRecord(key: string, now: number): void {
    const windowStart = now - this.windowMs;
    const entry = this.store.get(key) ?? { timestamps: [], lastSeen: now };

    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    entry.lastSeen   = now;

    if (entry.timestamps.length >= this.maxAttempts) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.timestamps.push(now);
    this.store.set(key, entry);
  }

  private evictStaleEntries(): void {
    const threshold = Date.now() - this.windowMs;
    for (const [key, entry] of this.store) {
      if (entry.lastSeen < threshold) this.store.delete(key);
    }
  }
}
