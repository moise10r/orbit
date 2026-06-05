import { SetMetadata } from '@nestjs/common';

export const RATE_LIMITED = 'rate_limited';
export const RateLimited = () => SetMetadata(RATE_LIMITED, true);