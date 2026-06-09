import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { Queue } from 'bullmq';
import axios from 'axios';
import * as crypto from 'crypto';

const WEBHOOK_QUEUE_NAME = 'webhook_delivery_queue';

export class WebhookService {
  constructor(
    // Strongly type the injected repositories/services:
    private readonly endpointRepo: {
      save: (e: any) => Promise<WebhookEndpoint>;
      create: (data: Partial<WebhookEndpoint>) => WebhookEndpoint;
      find: () => Promise<WebhookEndpoint[]>;
      findOne: (query: any) => Promise<WebhookEndpoint | undefined>;
      update: (id: string, update: Partial<WebhookEndpoint>) => Promise<any>;
      delete: (id: string) => Promise<void>;
    },
    private readonly deliveryRepo: {
      create: (data: any) => WebhookDelivery;
      save: (delivery: WebhookDelivery) => Promise<WebhookDelivery>;
    },
    private readonly webhookQueue: Queue,
    private readonly configService: { get: (k: string) => string },
  ) {}

  signPayload(secret: string, payload: any): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');
  }

  async createEndpoint(data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    return this.endpointRepo.save(this.endpointRepo.create(data));
  }

  async getEndpoints(): Promise<WebhookEndpoint[]> {
    return this.endpointRepo.find();
  }

  async getEndpointById(id: string): Promise<WebhookEndpoint | undefined> {
    return this.endpointRepo.findOne({ where: { id } });
  }

  async updateEndpoint(id: string, update: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    await this.endpointRepo.update(id, update);
    return this.getEndpointById(id);
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.endpointRepo.delete(id);
  }

  // Delivery
  async sendWebhook(endpoint: WebhookEndpoint, payload: any): Promise<WebhookDelivery> {
    const signature = this.signPayload(endpoint.secret, payload);
    let status: 'pending' | 'delivered' | 'failed' = 'pending';
    let responseCode: number | undefined;
    let errorMessage: string | undefined;
    try {
      const response = await axios.post(endpoint.url, payload, {
        headers: {
          'X-Orbit-Signature': signature,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      status = response.status >= 200 && response.status < 300 ? 'delivered' : 'failed';
      responseCode = response.status;
    } catch (err: any) {
      status = 'failed';
      responseCode = err?.response?.status;
      errorMessage = err?.message;
      // Handle retry queue
      await this.webhookQueue.add('deliver', {
        endpointId: endpoint.id,
        payload,
        tryCount: 1,
      });
    }

    const delivery: WebhookDelivery = this.deliveryRepo.create({
      endpointId: endpoint.id,
      status,
      responseCode,
      payload,
      retries: status === 'failed' ? 1 : 0,
      errorMessage,
    });
    return this.deliveryRepo.save(delivery);
  }
}
