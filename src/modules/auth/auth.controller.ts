import {
  Controller, Post, Body, Get, Delete, Param, Headers,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto, CreateApiKeyDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { Public } from './decorators/public.decorator';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(RateLimitGuard, IdempotencyGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  register(
    @Body() dto: RegisterDto,
    @Headers('x-idempotency-key') _idempotencyKey: string,
  ) {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard, IdempotencyGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(
    @Body() dto: LoginDto,
    @Headers('x-idempotency-key') _idempotencyKey: string,
  ) {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard, IdempotencyGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  refresh(
    @Body() dto: RefreshDto,
    @Headers('x-idempotency-key') _idempotencyKey: string,
  ) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  me(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys for the current workspace' })
  listKeys(@Request() req: AuthenticatedRequest) {
    return this.auth.listApiKeys(req.user.workspaceId);
  }

  @Post('api-keys')
  @UseGuards(IdempotencyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key — key is only shown once' })
  createKey(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateApiKeyDto,
    @Headers('x-idempotency-key') _idempotencyKey: string,
  ) {
    return this.auth.createApiKey(req.user.workspaceId, dto.name);
  }

  @Delete('api-keys/:id')
  @UseGuards(IdempotencyGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeKey(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Headers('x-idempotency-key') _idempotencyKey: string,
  ) {
    return this.auth.revokeApiKey(id, req.user.workspaceId);
  }
}