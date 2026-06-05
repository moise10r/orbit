import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { RateLimitGuard } from './modules/auth/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // additional DB config here
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ReleasesModule,
    NotificationsModule,
  ],
  providers: [
    { provide: 'APP_GUARD', useClass: RateLimitGuard }
  ],
})
export class AppModule {}