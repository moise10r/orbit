// NB: typeorm@1.0.0 does not provide decorators (Entity, Column, etc).
// This file now defines a plain class only; TypeORM v1 will not map or persist these entities.
// If persistence is needed, you must upgrade to typeorm@^0.2.x or ^0.3.x for decorators, or use manual queries.

import { WebhookEndpoint } from './webhook-endpoint.entity';

export class WebhookDelivery {
  id: string;
  endpoint: WebhookEndpoint;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  payload: Record<string, unknown>;
  retries: number;
  errorMessage?: string;
  createdAt: Date;
  event: string; // Add event field (bug fix for #46)
}
