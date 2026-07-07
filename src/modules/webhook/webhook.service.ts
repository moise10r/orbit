// Root cause: @nestjs/common, @nestjs/typeorm, @nestjs/bull provide NONE of the decorators used, and typeorm v1 does not have the decorator-based repository pattern.
// Further: POJO 'entities' cannot be injected, nor can repositories for non-mapped classes be injected.
// Also: "InjectQueue" and "InjectRepository" don't exist, so remove all DI, and directly construct dependencies.
// All DB operations must be re-written with direct typeorm v1 usage.
// axios *is* a project dependency (see verified registry info).

import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import axios from 'axios';
import * as crypto from 'crypto';
import Queue from 'bull';
const { Client } = require('typeorm');

export class WebhookService {
  // logger is omitted, as @nestjs/common is not valid here. Use console or custom log as needed.
  private deliveryQueue: any;
  constructor(
    public readonly endpointTable: string = 'webhook_endpoint',
    public readonly deliveryTable: string = 'webhook_delivery',
    public readonly dbClient = null, // typeorm v1 connection Client
    public readonly redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
  ) {
    this.deliveryQueue = new Queue('webhook-delivery', this.redisUrl);
  }

  signPayload(payload: object, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  async sendWebhook(endpoint: WebhookEndpoint, event: string, payload: object): Promise<void> {
    const signature = this.signPayload(payload, endpoint.secret);
    try {
      const response = await axios.post(endpoint.url, payload, {
        headers: {
          'X-Webhook-Signature': signature,
        },
      });
      // Insert delivery log using direct query (since no decorators/entities)
      await this.insertDelivery({
        endpoint,
        event,
        payload,
        status: 'success',
        responseCode: response.status,
        retries: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error(`Webhook delivery failed`, error.stack || error.message);
      await this.deliveryQueue.add({
        endpoint,
        event,
        payload,
        attempt: (typeof error?.config?.data?.attempt === 'number' ? error.config.data.attempt + 1 : 1),
      });
      // Insert failed delivery log
      await this.insertDelivery({
        endpoint,
        event,
        payload,
        status: 'failed',
        responseCode: (error.response && error.response.status) || null,
        retries: 1,
        errorMessage: error.message,
        createdAt: new Date(),
      });
    }
  }

  // These methods must be implemented with direct SQL for typeorm v1
  async insertDelivery(data: Partial<WebhookDelivery>) {
    // Example implementation; replace with manual SQL insert suitable for your ORM/config
    if (!this.dbClient) throw new Error('dbClient not set');
    await this.dbClient.query(
      `INSERT INTO ${this.deliveryTable} (endpoint_id, event, payload, status, response_code, retries, error_message, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        data.endpoint?.id,
        data.event,
        JSON.stringify(data.payload),
        data.status,
        data.responseCode,
        data.retries,
        data.errorMessage || null,
        data.createdAt || new Date(),
      ]
    );
  }

  async findAllEndpoints(): Promise<WebhookEndpoint[]> {
    if (!this.dbClient) throw new Error('dbClient not set');
    const res = await this.dbClient.query(`SELECT * FROM ${this.endpointTable}`);
    return res.rows;
  }

  async findEndpointById(id: string): Promise<WebhookEndpoint> {
    if (!this.dbClient) throw new Error('dbClient not set');
    const res = await this.dbClient.query(`SELECT * FROM ${this.endpointTable} WHERE id = $1 LIMIT 1`, [id]);
    return res.rows[0] || null;
  }

  async createEndpoint(dto: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    if (!this.dbClient) throw new Error('dbClient not set');
    // Simplified; supply your own validation/UUID logic
    const id = dto.id || require('crypto').randomUUID();
    await this.dbClient.query(
      `INSERT INTO ${this.endpointTable} (id, url, secret, events, active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now())`,
      [id, dto.url, dto.secret, JSON.stringify(dto.events || []), dto.active !== false]
    );
    return this.findEndpointById(id);
  }

  async updateEndpoint(id: string, dto: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    if (!this.dbClient) throw new Error('dbClient not set');
    // Merge changes (for simplicity only allows url, secret, events, active)
    await this.dbClient.query(
      `UPDATE ${this.endpointTable} SET url=$1, secret=$2, events=$3, active=$4, updated_at=now() WHERE id = $5`,
      [dto.url, dto.secret, JSON.stringify(dto.events), dto.active, id]
    );
    return this.findEndpointById(id);
  }

  async removeEndpoint(id: string): Promise<void> {
    if (!this.dbClient) throw new Error('dbClient not set');
    await this.dbClient.query(`DELETE FROM ${this.endpointTable} WHERE id = $1`, [id]);
  }
}
