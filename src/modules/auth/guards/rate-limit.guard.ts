import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.limit = this.configService.get<number>('RATE_LIMIT_MAX', 10);
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    const key = this.resolveKey(request);
    const now = Date.now();

    this.evictExpiredEntries(now);

    const store: Map<string, RateLimitEntry> = this.getStore(request);
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.limit) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests',
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const updatedEntry: RateLimitEntry = { count: entry.count + 1, resetAt: entry.resetAt };
    store.set(key, updatedEntry);
    return true;
  }

  private resolveKey(request: Request): string {
    const userId = (request as Request & { user?: { id?: string } }).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      request.socket?.remoteAddress ??
      'unknown';

    return `ip:${ip}`;
  }

  private getStore(request: Request): Map<string, RateLimitEntry> {
    const app = (request as Request & { app?: { locals?: { rateLimitStore?: Map<string, RateLimitEntry> } } }).app;
    if (app?.locals) {
      if (!app.locals.rateLimitStore) {
        app.locals.rateLimitStore = new Map<string, RateLimitEntry>();
      }
      return app.locals.rateLimitStore;
    }

    if (!RateLimitGuard.fallbackStore) {
      RateLimitGuard.fallbackStore = new Map<string, RateLimitEntry>();
    }
    return RateLimitGuard.fallbackStore;
  }

  private evictExpiredEntries(now: number): void {
    const store = RateLimitGuard.fallbackStore;
    if (!store) {
      return;
    }
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }

  private static fallbackStore: Map<string, RateLimitEntry> | undefined;
}