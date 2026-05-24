import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectRepoDto } from './dto/connect-repo.dto';
import {
  GitHubPushPayload,
  GitHubReleasePayload,
} from './dto/github-release-event.dto';
import { GitHubConnection } from './entities/github-connection.entity';
import { GitHubConnectionService } from './github-connection.service';
import { GitHubSyncService } from './github-sync.service';
import { GitHubWebhookService } from './github-webhook.service';
import { verifyWebhookSignature } from './utils/webhook-signature';

@ApiTags('github')
@Controller('github')
export class GitHubController {
  constructor(
    private readonly connections: GitHubConnectionService,
    private readonly webhook: GitHubWebhookService,
    private readonly sync: GitHubSyncService,
  ) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: GitHubConnection })
  @ApiOperation({ summary: 'Link a GitHub repository to a service' })
  connect(@Body() dto: ConnectRepoDto, @Req() req: any) {
    return this.connections.connect(dto, req.user.id);
  }

  @Delete('disconnect/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Unlink a service from its GitHub repository' })
  disconnect(@Param('serviceId') serviceId: string) {
    return this.connections.disconnect(serviceId);
  }

  @Get('connection/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: GitHubConnection })
  getConnection(@Param('serviceId') serviceId: string) {
    return this.connections.findByService(serviceId);
  }

  @Post('sync/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import existing GitHub releases for a service' })
  sync(@Param('serviceId') serviceId: string) {
    return this.sync.syncReleasesForService(serviceId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub webhook receiver — release and push events' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') sig: string,
    @Headers('x-github-event') event: string,
    @Body() payload: GitHubReleasePayload | GitHubPushPayload,
  ) {
    const repoOwner =
      (payload as any).repository?.owner?.login ??
      (payload as any).repository?.owner?.name ??
      '';
    const repoName = (payload as any).repository?.name ?? '';

    const connection = await this.connections.findByRepo(repoOwner, repoName);
    if (!connection) return { accepted: false, reason: 'no_connection' };

    const rawBody = req.rawBody;
    if (!rawBody || !verifyWebhookSignature(rawBody, connection.webhookSecret, sig)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (event === 'release') {
      const pending = await this.webhook.handleReleaseEvent(payload as GitHubReleasePayload);
      return { accepted: !!pending, pending };
    }

    if (event === 'push') {
      const pending = await this.webhook.handlePushEvent(payload as GitHubPushPayload);
      return { accepted: !!pending, pending };
    }

    return { accepted: false, reason: 'unhandled_event' };
  }
}
