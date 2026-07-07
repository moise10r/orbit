import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery, DeliveryStatus } from './entities/webhook-delivery.entity';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';

export interface WebhookPayload {
  event: string;
  workspaceId: string;
  [key: string]: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly endpointRepo: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    private readonly configService: ConfigService,
    @InjectQueue('webhook-deliveries') private readonly deliveryQueue: Queue,
  ) {}

  async triggerWebhooks(event: string, payload: WebhookPayload, workspaceId: string): Promise<void> {
    const endpoints = await this.endpointRepo.find({ where: { events: event, active: true, workspaceId } });
    for (const endpoint of endpoints) {
      await this.deliveryQueue.add('send', { endpointId: endpoint.id, event, workspaceId, payload });
    }
  }

  signPayload(secret: string, payload: object): string {
    const json = JSON.stringify(payload);
    return createHmac('sha256', secret).update(json).digest('hex');
  }

  async recordDelivery(delivery: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    return await this.deliveryRepo.save(delivery);
  }

  async findEndpoints(workspaceId: string): Promise<WebhookEndpoint[]> {
    return this.endpointRepo.find({ where: { workspaceId } });
  }

  async createEndpoint(dto: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const endpoint = this.endpointRepo.create(dto);
    return this.endpointRepo.save(endpoint);
  }

  async updateEndpoint(id: string, dto: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    await this.endpointRepo.update({ id }, dto);
    return this.endpointRepo.findOneBy({ id });
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.endpointRepo.delete({ id });
  }
}