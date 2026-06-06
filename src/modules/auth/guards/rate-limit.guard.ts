import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests: Record<string, number> = {};
  private limit = 100; // Example limit, adjust as needed

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;
    const currentTime = Date.now();

    if (!this.requests[ip]) {
      this.requests[ip] = 1;
    } else {
      this.requests[ip]++;
    }

    // Reset the count after a time interval (e.g., 1 hour)
    setTimeout(() => {
      delete this.requests[ip];
    }, 3600000);

    return this.requests[ip] <= this.limit;
  }
}