import { SetMetadata } from '@nestjs/common';

export const RATE_LIMITED_KEY = 'rateLimited';
export const RateLimited = (rateLimit: number) => SetMetadata(RATE_LIMITED_KEY, rateLimit);