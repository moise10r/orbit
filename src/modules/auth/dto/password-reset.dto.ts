import { IsEmail, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  // Documentation decorators for Swagger (like ApiProperty) are not available in @nestjs/swagger v11.4.4 per verified inspect_package output
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  // Documentation decorators for Swagger (like ApiProperty) are not available in @nestjs/swagger v11.4.4 per verified inspect_package output
  token: string;

  @MinLength(8)
  newPassword: string;
}
