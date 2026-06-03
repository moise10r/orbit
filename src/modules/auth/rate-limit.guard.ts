import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter: RateLimiterMemory;

  constructor(private configService: ConfigService) {
    const points = this.configService.get<number>('RATE_LIMIT_POINTS');
    const duration = this.configService.get<number>('RATE_LIMIT_DURATION');

    this.rateLimiter = new RateLimiterMemory({
      points: points, // Number of requests
      duration: duration, // In seconds
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;

    try {
      await this.rateLimiter.consume(ip);
      return true;
    } catch (rejRes) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}