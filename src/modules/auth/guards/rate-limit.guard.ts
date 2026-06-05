import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter: RateLimiterMemory;

  constructor(private configService: ConfigService) {
    const takeLimit = this.configService.get<number>('RATE_LIMIT_REQUESTS', 5);
    const duration = this.configService.get<number>('RATE_LIMIT_DURATION', 60);

    this.rateLimiter = new RateLimiterMemory({
      points: takeLimit,
      duration: duration,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    try {
      await this.rateLimiter.consume(request.ip);
      return true;
    } catch (rejRes) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
