import { WebhookService } from '../webhook.service';
import { Worker } from 'bullmq';

// The processor is NOT injectable nor a provider - instead, function to be invoked/called during bootstrap
// Call this in application/server bootstrap, passing the instantiated WebhookService and sharing BullMQ connection if needed

export function startWebhookDeliveryWorker(webhookService: WebhookService) {
  // listens to 'webhook-delivery-queue', picks up 'deliver' jobs
  const worker = new Worker(
    'webhook-delivery-queue',
    async (job) => {
      if (job.name === 'deliver' && job.data && typeof job.data.deliveryId === 'string') {
        await webhookService.deliver(job.data.deliveryId);
      }
    }
  );
  return worker;
}
