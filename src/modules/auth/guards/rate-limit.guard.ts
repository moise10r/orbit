import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly limit = 10;
  private readonly windowMs = 60000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const now = Date.now();
    const timestamps = (this.requests.get(ip) || []).filter(t => now - t < this.windowMs);
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    if (timestamps.length > this.limit) {
      throw new TooManyRequestsException();
    }
    return true;
  }
}