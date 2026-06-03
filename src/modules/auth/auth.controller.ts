import {
  Controller, Post, Body, Get, Delete, Param,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto, CreateApiKeyDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { RateLimitGuard } from './rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  me(@Request() req: { user: { id: string; email: string; name: string } }) {
    return req.user;
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys for the current workspace' })
  listKeys(@Request() req: { user: { workspaceId: string } }) {
    return this.auth.listApiKeys(req.user.workspaceId);
  }

  @Post('api-keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key — key is only shown once' })
  createKey(
    @Request() req: { user: { workspaceId: string } },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.auth.createApiKey(req.user.workspaceId, dto.name);
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeKey(
    @Param('id') id: string,
    @Request() req: { user: { workspaceId: string } },
  ) {
    return this.auth.revokeApiKey(id, req.user.workspaceId);
  }
}