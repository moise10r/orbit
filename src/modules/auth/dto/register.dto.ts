import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Moise Rushanika' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'moise@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperSecure123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Workspace slug may only contain lowercase letters, numbers, and hyphens' })
  workspaceSlug: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(100)
  workspaceName: string;
}
