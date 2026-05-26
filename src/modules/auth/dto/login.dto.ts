import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'moise@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperSecure123!' })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI Pipeline' })
  @IsString()
  name: string;
}
