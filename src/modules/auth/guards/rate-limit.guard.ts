import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter = new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      await this.rateLimiter.consume(request.ip); // Consume 1 point for each request
      return true;
    } catch {
      throw new ForbiddenException('Too many requests, please try again later.');
    }
  }
}
