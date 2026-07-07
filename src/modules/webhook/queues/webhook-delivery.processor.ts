import { Injectable } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { WebhookService } from '../webhook.service';

const WEBHOOK_QUEUE_NAME = 'webhook_delivery_queue';
const MAX_RETRIES = 5;

@Injectable()
@Processor(WEBHOOK_QUEUE_NAME)
export class WebhookDeliveryProcessor {
  constructor(private readonly webhookService: WebhookService) {}

  @Process('deliver')
  async handleDelivery(job: Job) {
    const { endpointId, payload, tryCount } = job.data;
    const endpoint = await this.webhookService.getEndpointById(endpointId);
    if (!endpoint || !endpoint.active) {
      return;
    }
    try {
      await this.webhookService.sendWebhook(endpoint, payload);
    } catch (err: any) {
      if (tryCount < MAX_RETRIES) {
        await job.queue.add(
          'deliver',
          { endpointId, payload, tryCount: tryCount + 1 },
          { delay: 2 ** tryCount * 1000 },
        );
      } else {
        // Optionally, log permanently failed delivery here
      }
    }
  }
}
