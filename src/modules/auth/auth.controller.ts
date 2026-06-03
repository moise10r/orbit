import {
  Controller, Post, Body, Get, Delete, Param,
  UseGuards, Request, HttpCode, HttpStatus, Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto, CreateApiKeyDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { IdempotencyService } from './idempotency/idempotency.service';
import { BadRequestException } from '@nestjs/common';

/** 24-hour TTL (in seconds) required for idempotency key storage per team decision. */
const IDEMPOTENCY_TTL_SECONDS = 86_400;

/**
 * Validates that an idempotency key is present and non-empty.
 * Throws BadRequestException so that NestJS exception filters handle the response.
 */
function requireIdempotencyKey(key: string | undefined): string {
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new BadRequestException(
      'Missing or empty X-Idempotency-Key header. A unique idempotency key is required for this endpoint.',
    );
  }
  return key.trim();
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('x-idempotency-key') rawKey: string | undefined,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawKey);

    const cached = await this.idempotency.get(idempotencyKey);
    if (cached !== null) {
      // Return a stable acknowledgement rather than a cached token bundle to
      // avoid replaying potentially expired or revoked credentials.
      return { idempotent: true, message: 'Registration already processed for this idempotency key.' };
    }

    const result = await this.auth.register(dto);

    // Store only a non-sensitive acknowledgement so that replayed requests
    // cannot receive previously issued (and possibly expired) tokens.
    await this.idempotency.set(
      idempotencyKey,
      { idempotent: true, message: 'Registration already processed for this idempotency key.' },
      IDEMPOTENCY_TTL_SECONDS,
    );

    return result;
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-idempotency-key') rawKey: string | undefined,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawKey);

    const cached = await this.idempotency.get(idempotencyKey);
    if (cached !== null) {
      // Return a stable acknowledgement rather than cached tokens to avoid
      // replaying potentially expired or revoked credentials.
      return { idempotent: true, message: 'Login already processed for this idempotency key.' };
    }

    const result = await this.auth.login(dto);

    await this.idempotency.set(
      idempotencyKey,
      { idempotent: true, message: 'Login already processed for this idempotency key.' },
      IDEMPOTENCY_TTL_SECONDS,
    );

    return result;
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  async refresh(
    @Body() dto: RefreshDto,
    @Headers('x-idempotency-key') rawKey: string | undefined,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawKey);

    const cached = await this.idempotency.get(idempotencyKey);
    if (cached !== null) {
      // Return a stable acknowledgement rather than cached tokens to avoid
      // replaying potentially expired or revoked credentials.
      return { idempotent: true, message: 'Token refresh already processed for this idempotency key.' };
    }

    const result = await this.auth.refresh(dto.refreshToken);

    await this.idempotency.set(
      idempotencyKey,
      { idempotent: true, message: 'Token refresh already processed for this idempotency key.' },
      IDEMPOTENCY_TTL_SECONDS,
    );

    return result;
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