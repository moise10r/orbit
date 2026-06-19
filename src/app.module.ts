import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RedisProvider } from './redis/redis.provider';

@Module({
  imports: [
    AuthModule,
    ReleasesModule,
    NotificationsModule,
  ],
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class AppModule {}
