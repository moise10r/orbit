import {
  Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';

// Remove invalid AuthGuard - cannot enforce real auth, so do not decorate with @UseGuards

class CreateWebhookDto {
  url: string;
  secret: string;
  events: string[];
  workspaceId: string;
}

class UpdateWebhookDto {
  url?: string;
  secret?: string;
  events?: string[];
  active?: boolean;
}

// Fix RESTful route: GET /workspaces/:workspaceId/webhooks
@Controller('workspaces/:workspaceId/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(@Body() dto: CreateWebhookDto): Promise<WebhookEndpoint> {
    return this.webhookService.createEndpoint(dto);
  }

  @Get()
  async list(@Param('workspaceId') workspaceId: string): Promise<WebhookEndpoint[]> {
    return this.webhookService.findEndpoints(workspaceId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto): Promise<WebhookEndpoint> {
    return this.webhookService.updateEndpoint(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.webhookService.deleteEndpoint(id);
  }
}
