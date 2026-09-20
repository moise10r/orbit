import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class ConnectRepoDto {
  @ApiProperty({ description: 'Service to link to this repository' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @MaxLength(100)
  repoOwner: string;

  @ApiProperty({ example: 'payments-api' })
  @IsString()
  @MaxLength(100)
  repoName: string;

  @ApiProperty({ required: false, default: 'main', example: 'main' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._\-/]+$/)
  @MaxLength(255)
  defaultBranch?: string;

  @ApiProperty({
    required: false,
    description: 'Personal access token with repo scope. Stored encrypted.',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
