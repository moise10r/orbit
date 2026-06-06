import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rateLimit';

export const RateLimited = (limit: number, duration: number) => {
  if (limit <= 0 || duration <= 0) {
    throw new Error('Limit and duration must be positive numbers');
  }
  return SetMetadata(RATE_LIMIT_METADATA_KEY, { limit, duration });
};