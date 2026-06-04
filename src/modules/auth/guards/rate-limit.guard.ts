import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface RateLimitEntry {
  count:   number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store    = new Map<string, RateLimitEntry>();
  private readonly limit:   number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.limit    = this.configService.get<number>('RATE_LIMIT_MAX', 10);
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60_000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key     = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const now     = Date.now();
    const entry   = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count++;
    return true;
  }
}
