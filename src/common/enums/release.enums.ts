import type { ReleaseStatus } from '../../modules/releases/entities/release.entity';
import type { EnvironmentTier } from '../../modules/releases/entities/environment.entity';

export const RELEASE_STATUSES = [
  'draft',
  'staged',
  'deployed',
  'rolled_back',
  'failed',
] as const satisfies ReleaseStatus[];

export const ENVIRONMENT_TIERS = [
  'development',
  'staging',
  'production',
] as const satisfies EnvironmentTier[];
