import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimited = (limit: number, duration: number) => SetMetadata(RATE_LIMIT_KEY, { limit, duration });