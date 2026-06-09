import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryProcessor } from './consumer/webhook-delivery.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]),
    BullModule.registerQueue({
      name: 'webhook-delivery-queue',
    }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDeliveryProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}