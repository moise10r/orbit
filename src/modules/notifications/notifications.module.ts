import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { WebhookRetryQueueService } from './webhook-retry-queue.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationChannel, NotificationLog])],
  providers: [NotificationsService, WebhookRetryQueueService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WebhookRetryQueueService],
})
export class NotificationsModule {}
