import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryProcessor } from './queues/webhook-delivery.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

const WEBHOOK_QUEUE_NAME = 'webhook_delivery_queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]),
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE_NAME,
    }),
  ],
  providers: [WebhookService, WebhookDeliveryProcessor],
  controllers: [WebhookController],
  exports: [WebhookService],
})
export class WebhookModule {
  static forRoot(): any {
    return {
      module: WebhookModule,
      providers: [WebhookService, WebhookDeliveryProcessor],
      controllers: [WebhookController],
      exports: [WebhookService],
    };
  }
}
