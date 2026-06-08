import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { ApiKey } from './entities/api-key.entity';

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
    // Per-IP rate limiting for the auth endpoints. The `default` throttler here is
    // the module-wide baseline; `register`/`login` override it with stricter,
    // route-specific limits via @Throttle (see auth.controller.ts).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
      errorMessage: 'Too many requests from this address — please wait a moment and try again.',
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ApiKeyGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, TypeOrmModule],
})
export class AuthModule {}
