import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

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
  @ApiPropertyOptional({ enum: ['draft', 'staged', 'deployed', 'rolled_back', 'failed'] })
  @IsOptional()
  @IsEnum(['draft', 'staged', 'deployed', 'rolled_back', 'failed'])
  status?: string;
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
