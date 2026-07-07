import { IsEmail } from 'class-validator';

export class LoginDto {
  email: string;
  password: string;
}

export class RefreshDto {
  refreshToken: string;
}

export class CreateApiKeyDto {
  name: string;
}
