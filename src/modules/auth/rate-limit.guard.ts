import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter: RateLimiterMemory;

  constructor() {
    this.rateLimiter = new RateLimiterMemory({
      points: 5, // 5 requests
      duration: 60, // per 60 seconds
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    try {
      await this.rateLimiter.consume(ip);
      return true;
    } catch (rejRes) {
      throw new ForbiddenException('Too many requests, please try again later.');
    }
  }
}