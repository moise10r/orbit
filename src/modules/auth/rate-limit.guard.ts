import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { LaunchDarklyService } from './launchdarkly.service'; // Assuming there is a service to fetch feature flags

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiter: rateLimit.RateLimit;

  constructor(private readonly launchDarklyService: LaunchDarklyService) {
    this.configureRateLimiter();
  }

  private async configureRateLimiter() {
    const windowMs = await this.launchDarklyService.getFeatureFlagValue('rateLimitWindowMs') || 15 * 60 * 1000; // Default to 15 minutes
    const max = await this.launchDarklyService.getFeatureFlagValue('rateLimitMax') || 100; // Default to 100 requests

    this.limiter = rateLimit({
      windowMs,
      max,
      message: 'Too many requests, please try again later.',
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    return new Promise((resolve, reject) => {
      this.limiter(request, null, (err) => {
        if (err) {
          reject(new ForbiddenException());
        } else {
          resolve(true);
        }
      });
    }).catch(() => {
      throw new ForbiddenException();
    });
  }
}