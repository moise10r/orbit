// NB: typeorm@1.0.0 does not provide decorators (Entity, Column, etc).
// This file now defines a plain class only; TypeORM v1 will not map or persist these entities.
// If persistence is needed, you must upgrade to typeorm@^0.2.x or ^0.3.x for decorators, or use manual queries.

export class WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
