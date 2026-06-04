import {
  Controller, Post, Body, Get, Delete, Param,
  UseGuards, Request, HttpCode, HttpStatus, Headers,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { Public } from './decorators/public.decorator';
import { validateRegister, validateLogin, validateRefresh, validateCreateApiKey } from './validation/auth.schemas';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

function requireIdempotencyKey(idempotencyKey: string | undefined): void {
  if (!idempotencyKey || idempotencyKey.trim() === '') {
    throw new UnprocessableEntityException(
      'X-Idempotency-Key header is required for this endpoint',
    );
  }
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  register(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Body() body: unknown,
  ) {
    requireIdempotencyKey(idempotencyKey);
    const dto = validateRegister(body);
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Body() body: unknown,
  ) {
    requireIdempotencyKey(idempotencyKey);
    const dto = validateLogin(body);
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  refresh(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Body() body: unknown,
  ) {
    requireIdempotencyKey(idempotencyKey);
    const dto = validateRefresh(body);
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key — key is only shown once' })
  createKey(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    requireIdempotencyKey(idempotencyKey);
    const dto = validateCreateApiKey(body);
    return this.auth.createApiKey(req.user.workspaceId, dto.name);
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeKey(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.auth.revokeApiKey(id, req.user.workspaceId);
  }
}