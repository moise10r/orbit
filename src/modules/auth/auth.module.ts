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
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { ApiKey } from './entities/api-key.entity';
import { FeatureToggleService } from '../feature-toggle/feature-toggle.service';
import { RateLimitGuard } from './rate-limit.guard';

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
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ApiKeyGuard,
    {
      provide: RateLimitGuard,
      useFactory: async (featureToggleService: FeatureToggleService) => {
        const isRateLimitingEnabled = await featureToggleService.isFeatureEnabled('RATE_LIMITING');
        return isRateLimitingEnabled ? new RateLimitGuard() : null;
      },
      inject: [FeatureToggleService],
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, TypeOrmModule],
})
export class AuthModule {}