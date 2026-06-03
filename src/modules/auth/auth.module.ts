// src/modules/auth/auth.controller.ts
import {
  Controller, Post, Body, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { RateLimitGuard } from './rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  async register(@Body() registerDto: RegisterDto) {
    return this.auth.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in an existing user' })
  async login(@Body() loginDto: LoginDto) {
    return this.auth.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh login session' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.auth.refresh(refreshDto);
  }

  // other methods...
}