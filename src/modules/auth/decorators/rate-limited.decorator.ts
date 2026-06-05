import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_OPTIONS_KEY = 'rateLimit';

export const RateLimited = (limit: number, duration: number) => {
  return SetMetadata(RATE_LIMIT_OPTIONS_KEY, { limit, duration });
};