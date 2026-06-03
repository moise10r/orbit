import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiter: rateLimit.RateLimit;

  constructor(private reflector: Reflector) {
    const rateLimitConfig = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      handler: (req: Request, res, next) => {
        throw new ForbiddenException('Too many requests, please try again later.');
      },
    };
    this.limiter = rateLimit(rateLimitConfig);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return new Promise((resolve, reject) => {
      this.limiter(request, null, (err) => {
        if (err) {
          reject(new ForbiddenException('Too many requests, please try again later.'));
        } else {
          resolve(true);
        }
      });
    }).catch(() => false);
  }
}