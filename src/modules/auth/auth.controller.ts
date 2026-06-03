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

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
  ) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create a workspace' })
  async register(
    @Body() dto: RegisterDto,
  ) {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  async login(
    @Body() dto: LoginDto,
  ) {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  async refresh(
    @Body() dto: RefreshDto,
  ) {
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
    return this.auth.createApiKey(req.user.workspaceId, dto);
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteKey(
    @Request() req: { user: { workspaceId: string } },
    @Param('id') id: string,
  ) {
    return this.auth.revokeApiKey(req.user.workspaceId, id);
  }
}