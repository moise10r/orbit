import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReleaseEnvironment } from '../entities/release.entity';

export class CreateReleaseDto {
  @ApiProperty({ example: 'v2.4.1' })
  @IsString()
  @MaxLength(50)
  version: string;

  @ApiProperty({ description: 'Service this release belongs to' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ enum: ReleaseEnvironment, default: ReleaseEnvironment.STAGING })
  @IsEnum(ReleaseEnvironment)
  environment: ReleaseEnvironment;

  @ApiProperty({ required: false, example: 'Fix payment timeout under high load' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ required: false, example: 'a1b2c3d' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  commitSha?: string;
}
