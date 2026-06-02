import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsObject } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateChannelDto {
  @ApiProperty({ example: 'Engineering Slack' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['slack', 'email'] })
  @IsEnum(['slack', 'email'])
  type: 'slack' | 'email';

  @ApiProperty({ example: { webhookUrl: 'https://hooks.slack.com/...' } })
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty({ example: ['deployment.failed', 'release.rolled_back'] })
  @IsArray()
  events: string[];
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('channels')
  @ApiOperation({ summary: 'List notification channels for the workspace' })
  list(@Request() req: { user: { workspaceId: string } }) {
    return this.svc.listChannels(req.user.workspaceId);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create a Slack or email notification channel' })
  create(
    @Request() req: { user: { workspaceId: string } },
    @Body() dto: CreateChannelDto,
  ) {
    return this.svc.createChannel(
      req.user.workspaceId,
      dto.name,
      dto.type,
      dto.config,
      dto.events,
    );
  }

  @Delete('channels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification channel' })
  remove(
    @Request() req: { user: { workspaceId: string } },
    @Param('id') id: string,
  ) {
    return this.svc.deleteChannel(req.user.workspaceId, id);
  }
}
