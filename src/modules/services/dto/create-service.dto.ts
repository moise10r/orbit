import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ServiceLanguage } from '../entities/service.entity';

export class CreateServiceDto {
  @ApiProperty({ example: 'Payments API' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'payments-api',
    description: 'URL-safe identifier — lowercase letters, numbers, and hyphens only',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens (e.g. payments-api)',
  })
  @MaxLength(60)
  slug: string;

  @ApiProperty({ required: false, example: 'Handles card payments and refunds' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, example: 'https://github.com/acme/payments-api' })
  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @ApiProperty({ enum: ServiceLanguage, required: false })
  @IsOptional()
  @IsEnum(ServiceLanguage)
  language?: ServiceLanguage;
}
