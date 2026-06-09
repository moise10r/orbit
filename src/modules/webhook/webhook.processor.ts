// @nestjs/common Injectable/Logger and @nestjs/bull Processor/Process do not exist at runtime for given versions.
// Remove all decorators, perform job registration manually via bull@4 API.
// Usage: Instantiate and call registerProcessingQueue from your app bootstrap.
import { WebhookService } from './webhook.service';
import Queue from 'bull';

export class WebhookProcessor {
  constructor(private readonly webhookService: WebhookService, private readonly redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {}

  registerProcessingQueue() {
    const queue = new Queue('webhook-delivery', this.redisUrl);
    queue.process(async (job) => {
      const { endpoint, event, payload, attempt = 1 } = job.data;
      try {
        await this.webhookService.sendWebhook(endpoint, event, payload);
        console.log(`Delivered webhook to ${endpoint.url}`);
      } catch (err) {
        if (attempt < 3) {
          console.warn(`Retrying webhook delivery (attempt ${attempt + 1}): ${endpoint.url}`);
          await queue.add({ ...job.data, attempt: attempt + 1 }, { delay: Math.pow(2, attempt) * 1000 });
        } else {
          console.error(`Webhook delivery failed after 3 attempts: ${endpoint.url}`);
        }
      }
    });
  }
}
