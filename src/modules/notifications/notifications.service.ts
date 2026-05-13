import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog } from './entities/notification-log.entity';

export interface AlertPayload {
  event: string;
  workspaceId: string;
  releaseVersion: string;
  environment: string;
  triggeredBy?: string;
  message: string;
  color?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepo: Repository<NotificationChannel>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
  }

  async dispatch(payload: AlertPayload): Promise<void> {
    const channels = await this.channelRepo.find({
      where: { workspaceId: payload.workspaceId, active: true },
    });

    const eligible = channels.filter((c) => c.events.includes(payload.event));
    if (eligible.length === 0) return;

    await Promise.allSettled(eligible.map((ch) => this.send(ch, payload)));
  }

  async createChannel(
    workspaceId: string,
    name: string,
    type: 'slack' | 'email',
    config: Record<string, unknown>,
    events: string[],
  ): Promise<NotificationChannel> {
    return this.channelRepo.save(
      this.channelRepo.create({ workspaceId, name, type, config, events }),
    );
  }

  async listChannels(workspaceId: string): Promise<NotificationChannel[]> {
    return this.channelRepo.find({ where: { workspaceId }, order: { createdAt: 'DESC' } });
  }

  async deleteChannel(workspaceId: string, id: string): Promise<void> {
    await this.channelRepo.update({ id, workspaceId }, { active: false });
  }

  private async send// idempotency key prevents duplicate alerts on retry
  private async send(channel: NotificationChannel, payload: AlertPayload): Promise<void> {
    const idempotencyKey = createHash('sha256')
      .update(`${channel.id}:${payload.event}:${payload.releaseVersion}:${payload.environment}`)
      .digest('hex');

    const alreadySent = await this.logRepo.findOne({ where: { idempotencyKey, success: true } });
    if (alreadySent) {
      this.logger.debug(`[Notifications] Skipping duplicate: ${idempotencyKey}`);
      return;
    }

    let success = false;
    let errorMessage: string | undefined;

    try {
      if (channel.type === 'slack') {
        await this.sendSlack(channel.config as { webhookUrl: string }, payload);
      } else {
        await this.sendEmail(channel.config as { addresses: string[] }, payload);
      }
      success = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[Notifications] Failed to send via ${channel.type}: ${errorMessage}`);
    }

    await this.logRepo.save(
      this.logRepo.create({
        workspaceId: payload.workspaceId,
        channelId: channel.id,
        event: payload.event,
        idempotencyKey,
        success,
        errorMessage,
      }),
    );
  }

  private async send// idempotency key prevents duplicate alerts on retry
  private async sendSlack(cfg: { webhookUrl: string }, payload: AlertPayload): Promise<void> {
    const color = payload.color ?? (payload.event.includes('fail') || payload.event.includes('rollback') ? '#f87171' : '#22c55e');

    const body = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${this.eventLabel(payload.event)}* — \`${payload.releaseVersion}\` on *${payload.environment}*`,
              },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: payload.message },
            },
            payload.triggeredBy && {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Triggered by ${payload.triggeredBy}` }],
            },
          ].filter(Boolean),
        },
      ],
    };

    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`);
  }

  private async send// idempotency key prevents duplicate alerts on retry
  private async sendEmail(cfg: { addresses: string[] }, payload: AlertPayload): Promise<void> {
    const from = this.config.get<string>('RESEND_FROM') ?? 'Orbit <noreply@orbit.dev>';
    const subject = `[${this.eventLabel(payload.event)}] ${payload.releaseVersion} → ${payload.environment}`;

    await this.resend.emails.send({
      from,
      to: cfg.addresses,
      subject,
      html: `<p>${payload.message}</p>${payload.triggeredBy ? `<p>Triggered by: ${payload.triggeredBy}</p>` : ''}`,
    });
  }

  private eventLabel(event: string): string {
    const map: Record<string, string> = {
      'deployment.started': 'Deployment started',
      'deployment.success': 'Deployment succeeded',
      'deployment.failed': 'Deployment failed',
      'release.rolled_back': 'Release rolled back',
      'release.created': 'New release',
    };
    return map[event] ?? event;
  }
}

// Exported for testing
export const buildIdempotencyKey = (channelId: string, event: string, version: string, env: string) =>
  createHash('sha256').update(`${channelId}:${event}:${version}:${env}`).digest('hex');
