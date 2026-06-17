import { IsString, IsOptional, IsEnum, Matches, IsInt, Min, Max, IsBoolean, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RELEASE_STATUSES, ENVIRONMENT_TIERS } from '@/common/enums/release.enums';

export class ListReleasesQueryDto {
  @ApiPropertyOptional({ enum: RELEASE_STATUSES })
  @IsOptional()
  @IsEnum(RELEASE_STATUSES)
  status?: typeof RELEASE_STATUSES[number];

  @ApiPropertyOptional({ example: '1.4' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Production' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ENVIRONMENT_TIERS })
  @IsEnum(ENVIRONMENT_TIERS)
  tier: typeof ENVIRONMENT_TIERS[number];

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string;
}

export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateReleaseDto {
  @ApiProperty({ example: '1.4.2' })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/, { message: 'Version must be a valid semver string' })
  version: string;

  @ApiPropertyOptional({ example: 'Payment gateway integration' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '## What changed\n- Added Stripe integration\n- Fixed tax calculation bug' })
  @IsOptional()
  @IsString()
  changelog?: string;

  @ApiPropertyOptional({ example: 'a3f1bc9' })
  @IsOptional()
  @IsString()
  commitSha?: string;

  @ApiPropertyOptional({ example: 'v1.4.2' })
  @IsOptional()
  @IsString()
  tag?: string;
}

export class UpdateReleaseDto extends PartialType(CreateReleaseDto) {
  @ApiPropertyOptional({ enum: RELEASE_STATUSES })
  @IsOptional()
  @IsEnum(RELEASE_STATUSES)
  status?: typeof RELEASE_STATUSES[number];
}

export class CreateDeploymentDto {
  @ApiProperty({ example: 'env-uuid' })
  @IsString()
  environmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triggeredByName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  meta?: Record<string, unknown>;
}

export class UpdateDeploymentDto {
  @ApiProperty({ enum: ['pending', 'running', 'success', 'failed', 'rolled_back'] })
  @IsEnum(['pending', 'running', 'success', 'failed', 'rolled_back'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  log?: string;
}
