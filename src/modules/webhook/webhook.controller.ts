import { WebhookService } from './webhook.service';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { Post, Get, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';

// AuthGuard and Request types would normally be imported from your project's auth module
// For example:
// import { AuthGuard } from '../auth/auth.guard';
// But we'll use a stub for demonstration.
class AuthGuard {
  canActivate() {
    return true;
  }
}

@UseGuards(AuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(@Body() dto: CreateWebhookEndpointDto, @Req() req: any) {
    // Ensure workspaceId is set from the authenticated context
    return this.webhookService.createEndpoint({ ...dto, workspaceId: req.user.workspaceId });
  }

  @Get()
  async findAll(@Req() req: any) {
    // In a real app, filter by workspaceId:
    // return this.webhookService.getEndpointsForWorkspace(req.user.workspaceId);
    return this.webhookService.getEndpoints();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.webhookService.getEndpointById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
    @Req() req: any,
  ) {
    return this.webhookService.updateEndpoint(id, { ...dto, workspaceId: req.user.workspaceId });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.webhookService.deleteEndpoint(id);
    return { deleted: true };
  }
}
