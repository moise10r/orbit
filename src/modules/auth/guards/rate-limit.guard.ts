import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests: Record<string, number[]> = {}; // Store timestamps of requests
  private readonly limit: number = 5; // Limit of requests
  private readonly interval: number = 60000; // Time frame of 1 minute in ms

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;

    // Initialize request array for the IP if it doesn't exist
    if (!this.requests[ip]) {
      this.requests[ip] = [];
    }

    const now = Date.now();
    // Filter out timestamps that are older than the interval
    this.requests[ip] = this.requests[ip].filter(timestamp => timestamp > now - this.interval);

    if (this.requests[ip].length < this.limit) {
      this.requests[ip].push(now);
      return true;
    }

    // If limit is exceeded, return false
    return false;
  }
}