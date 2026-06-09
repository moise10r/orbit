// @nestjs/common Controller, Get, Post, Put, Delete, Body, Param, UseGuards are NOT exported in v11.1.26. Remove all imports/decorators. Manual HTTP routing is required.
// If authentication/authorization is needed, must be implemented manually or via a compatible middleware in main bootstrap.
// Preserve the core structure and logic.

import { WebhookService } from './webhook.service';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';

// Basic auth guard stub for completeness per Issue #49 (must be implemented manually in actual HTTP layer).
function requireAuth(req, res, next) {
  // Dummy example; implement as appropriate
  if (!req.headers['authorization']) {
    res.status(401).send({ error: 'Unauthorized' });
    return;
  }
  next();
}

// WebhookController now a plain class.
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // Example manual route shapes (to be hooked to an HTTP server/router in main app)
  async findAll(req, res) {
    requireAuth(req, res, () => {
      this.webhookService.findAllEndpoints()
        .then(data => res.json(data))
        .catch(e => res.status(500).json({ error: String(e) }));
    });
  }

  async findOne(req, res) {
    requireAuth(req, res, async () => {
      const { id } = req.params;
      try {
        const endpoint = await this.webhookService.findEndpointById(id);
        if (!endpoint) return res.status(404).json({ error: 'Not found' });
        res.json(endpoint);
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });
  }

  async create(req, res) {
    requireAuth(req, res, () => {
      this.webhookService.createEndpoint(req.body)
        .then(data => res.json(data))
        .catch(e => res.status(500).json({ error: String(e) }));
    });
  }

  async update(req, res) {
    requireAuth(req, res, async () => {
      const { id } = req.params;
      try {
        const updated = await this.webhookService.updateEndpoint(id, req.body);
        res.json(updated);
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });
  }

  async remove(req, res) {
    requireAuth(req, res, async () => {
      const { id } = req.params;
      try {
        await this.webhookService.removeEndpoint(id);
        res.json({ deleted: true });
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });
  }
}
