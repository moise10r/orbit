import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto): Promise<any> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  async refresh(@Body() refreshDto: RefreshDto): Promise<any> {
    return this.authService.refresh(refreshDto);
  }

  @Post('create-api-key')
  @UseGuards(RateLimitGuard)
  async createApiKey(@Request() req): Promise<any> {
    // Added check for req.user
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.authService.createApiKey(req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req): Promise<any> {
    return this.authService.getMe(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard) // Added authorization guard
  async getUser(@Param('id') id: string): Promise<any> {
    return this.authService.getUserById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Added authorization guard
  async deleteUser(@Param('id') id: string): Promise<any> {
    return this.authService.deleteUser(id);
  }
}