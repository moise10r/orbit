import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: { limit: number, ttl: number }) => SetMetadata(RATE_LIMIT_KEY, options);
