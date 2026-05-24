import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReleaseStatus } from '../entities/release.entity';

export class UpdateReleaseDto {
  @ApiProperty({ enum: ReleaseStatus, required: false })
  @IsOptional()
  @IsEnum(ReleaseStatus)
  status?: ReleaseStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ required: false, example: '2024-05-20T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  deployedAt?: string;
}
