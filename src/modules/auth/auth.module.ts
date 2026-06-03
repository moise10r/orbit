import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { IdempotencyService } from './idempotency/idempotency.service';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { ApiKey } from './entities/api-key.entity';

/**
 * NOTE: RateLimitGuard is exported from this module so that any external module
 * that applies RateLimitGuard declaratively via @UseGuards() can resolve its
 * ConfigService dependency through the NestJS DI injector. Without exporting it,
 * any external declarative use will fail to inject ConfigService at runtime.
 * External modules must import AuthModule to use RateLimitGuard.
 *
 * NOTE: RateLimitGuard uses an in-memory, per-process store. In a multi-pod or
 * multi-process deployment, rate limits are not shared across instances. A
 * distributed store (e.g. Redis) must be introduced before relying on this
 * guard in production fleet deployments.
 *
 * NOTE: Guard execution order on public auth endpoints (register/login/refresh):
 * RateLimitGuard is applied at the method level and runs in its own guard chain.
 * JwtAuthGuard is applied at the class level but is bypassed for Public() endpoints.
 * NestJS evaluates method-level guards after class-level guards, but because
 * JwtAuthGuard short-circuits via the Public() decorator before any token parsing,
 * RateLimitGuard will still enforce limits on these endpoints. If stricter ordering
 * is required, consider applying RateLimitGuard at the class level or using a
 * global guard with appropriate metadata checks.
 *
 * NOTE: LDClient initialization is performed once during module bootstrap via
 * the OnModuleInit lifecycle hook in RateLimitGuard, not in the constructor.
 * If initialization fails, a warning is logged and the guard falls back to
 * compiled-in defaults. This degradation is explicit and visible in logs.
 *
 * NOTE: The cleanup() method in RateLimitGuard prunes only entries whose
 * window has fully elapsed and that are not currently in a block period,
 * preventing accidental removal of active or still-blocked entries.
 *
 * NOTE: IP extraction in RateLimitGuard uses only req.socket.remoteAddress
 * (the direct TCP peer address) and does not trust X-Forwarded-For or any
 * other client-supplied headers, preventing header-spoofing bypass attacks.
 * If the service runs behind a trusted reverse proxy, update extractIp to
 * validate and parse the proxy-set header after confirming the deployment
 * topology and proxy trust boundaries.
 *
 * NOTE: IdempotencyService is provided here so that AuthController can inject
 * it via NestJS DI. Without listing it in providers, Nest cannot resolve the
 * dependency and will throw at runtime with 'Nest can't resolve dependencies
 * of AuthController'.
 *
 * NOTE: Idempotency keys for auth endpoints are stored with a 24-hour TTL
 * (IDEMPOTENCY_TTL_SECONDS = 86400) per team decision. The cached response
 * for auth endpoints intentionally omits raw token payloads; only a
 * stable, non-sensitive acknowledgement is cached to avoid returning
 * previously issued (and potentially expired or revoked) tokens to callers
 * on replayed requests.
 *
 * NOTE: LaunchDarkly flag evaluations in RateLimitGuard use an LDUser context
 * keyed by the requesting IP address rather than a single static key, so that
 * flags can be targeted per-IP, per-environment, or per-user segment without
 * changing application code.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Workspace, ApiKey]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ApiKeyGuard, RateLimitGuard, IdempotencyService],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, RateLimitGuard, IdempotencyService, TypeOrmModule],
})
export class AuthModule {}