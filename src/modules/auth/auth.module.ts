import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (config: ConfigService) => ({
      secret: config.get<string>('JWT_SECRET'),
      signOptions: { expiresIn: '60s' },
    }),
    inject: [ConfigService],
  }), PassportModule.register({ defaultStrategy: 'jwt' }),],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RateLimitGuard],
  exports: [JwtAuthGuard, PassportModule],
})
export class AuthModule {}