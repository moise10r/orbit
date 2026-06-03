import { Injectable, ExecutionContext, ForbiddenException, CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly rateLimit: number;
  private readonly timeWindow: number; // in milliseconds
  private requests: Map<string, { count: number; startTime: number }> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.rateLimit = this.configService.get<number>('RATE_LIMIT') || 100; // Default to 100 requests
    this.timeWindow = this.configService.get<number>('TIME_WINDOW') || 60000; // Default to 60 seconds
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;

    const currentTime = Date.now();
    const requestInfo = this.requests.get(ip) || { count: 0, startTime: currentTime };

    this.checkRateLimit(requestInfo, currentTime);
  
    this.requests.set(ip, requestInfo);
    return true;
  }

  private checkRateLimit(requestInfo: { count: number; startTime: number }, currentTime: number): void {
    if (currentTime - requestInfo.startTime < this.timeWindow) {
      if (requestInfo.count >= this.rateLimit) {
        throw new ForbiddenException('Rate limit exceeded');
      }
      requestInfo.count++;
    } else {
      requestInfo.count = 1;
      requestInfo.startTime = currentTime;
    }
  }
}