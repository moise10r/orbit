import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly limit = 10;
  private readonly windowMs = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const timestamps = (this.requests.get(ip) ?? []).filter(t => now - t < this.windowMs);
    if (timestamps.length >= this.limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }
}