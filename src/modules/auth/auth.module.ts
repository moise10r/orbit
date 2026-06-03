import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimiter {
  private readonly rateLimit: number;
  private readonly timeWindow: number; // in milliseconds
  private requests: Map<string, { count: number; startTime: number }> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.rateLimit = this.configService.get<number>('RATE_LIMIT', 100); // Default to 100 requests
    this.timeWindow = this.configService.get<number>('TIME_WINDOW', 60000); // Default to 60 seconds
  }

  private isRateLimitExceeded(ipRequests: { count: number; startTime: number }, currentTime: number): boolean {
    return ipRequests.count >= this.rateLimit && (currentTime - ipRequests.startTime) <= this.timeWindow;
  }

  private resetRequests(ip: string, currentTime: number): void {
    this.requests.set(ip, { count: 1, startTime: currentTime });
  }

  private incrementRequests(ipRequests: { count: number; startTime: number }): void {
    ipRequests.count++;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;

    const currentTime = Date.now();
    const ipRequests = this.requests.get(ip) || { count: 0, startTime: currentTime };

    if (currentTime - ipRequests.startTime > this.timeWindow) {
      this.resetRequests(ip, currentTime);
      return true;
    }

    if (!this.isRateLimitExceeded(ipRequests, currentTime)) {
      this.incrementRequests(ipRequests);
      this.requests.set(ip, ipRequests);
      return true;
    }

    throw new ForbiddenException('Rate limit exceeded. Try again later.');
  }
}