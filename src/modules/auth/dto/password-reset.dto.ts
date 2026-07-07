import { IsEmail, MinLength, Contains } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @MinLength(1, { message: 'Token must be a string and not empty' })
  token: string;

  @MinLength(8)
  newPassword: string;
}
