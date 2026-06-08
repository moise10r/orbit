import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ThrottlerModule, ThrottlerMiddleware } from '@nestjs/throttler';
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
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '15m' },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ApiKeyGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, TypeOrmModule],
})
export class AuthModule {
  constructor(private readonly authService: AuthService) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ThrottlerMiddleware)
      .forRoutes(AuthController);
  }
}