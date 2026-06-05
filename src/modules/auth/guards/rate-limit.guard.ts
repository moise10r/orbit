import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private readonly rateLimitService: RateLimitService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        return this.rateLimitService.checkRateLimit(request);
    }
}