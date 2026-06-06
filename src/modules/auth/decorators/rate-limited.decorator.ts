import { SetMetadata, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const RATE_LIMITED = 'rateLimited';
export const RateLimited = () => SetMetadata(RATE_LIMITED, true);

// Rate limiting implementation using throttler
export const limitRequests: NestMiddleware = (req, res, next) => {
  const throttler = new ThrottlerGuard();
  throttler.canActivate(req, res)
    .then(canProceed => {
      if (canProceed) {
        next();
      } else {
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }
    })
    .catch(err => {
      console.error('Rate limiting error:', err);
      next(new HttpException('Rate Limiting Error', HttpStatus.INTERNAL_SERVER_ERROR));
    });
};