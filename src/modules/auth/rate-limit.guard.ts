import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  TooManyRequestsException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import rateLimit from 'express-rate-limit';
import { rateLimit as rateLimitDecorator } from 'nestjs-rate-limiter';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiter: ReturnType<typeof rateLimit>;

  constructor() {
    this.limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      handler: (req, res) => {
        throw new TooManyRequestsException();
      },
    });
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Call the limiter manually because it's not part of the standard NestJS guard flow
    return new Promise((resolve, reject) => {
      this.limiter(request, response, (err) => {
        if (err) {
          if (err instanceof TooManyRequestsException) {
            reject(new UnauthorizedException(err.message));
          } else {
            reject(new UnauthorizedException('Rate limit exceeded.'));
          }
        } else {
          resolve(true);
        }
      });
    });
  }
}