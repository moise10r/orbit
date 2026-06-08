import {
  Controller, Post, Body, Get, Delete, Param,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto, CreateApiKeyDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

// Per-IP limits for the unauthenticated auth endpoints — tighter than the module-wide
// default since these are the routes most exposed to credential-stuffing and signup abuse.
const REGISTER_RATE_LIMIT_PER_WINDOW = 5;
const REGISTER_RATE_WINDOW_MS        = 60_000;
const LOGIN_RATE_LIMIT_PER_WINDOW    = 10;
const LOGIN_RATE_WINDOW_MS           = 60_000;

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: REGISTER_RATE_LIMIT_PER_WINDOW, ttl: REGISTER_RATE_WINDOW_MS } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LOGIN_RATE_LIMIT_PER_WINDOW, ttl: LOGIN_RATE_WINDOW_MS } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
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
