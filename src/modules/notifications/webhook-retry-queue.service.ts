import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { AlertPayload } from './notifications.service';

export interface WebhookRetryJob {
  id: string;
  webhookUrl: string;
  payload: AlertPayload;
  attempt: number;
  channelId: string;
  idempotencyKey: string;
  createdAt: string;
}

// Exponential back-off delays per retry attempt (0-indexed).
// attempt 0 = 1st retry (2nd overall delivery attempt), attempt 4 = last retry.
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length; // 5

const RETRY_QUEUE_KEY = 'orbit:webhook:retry';
const DLQ_KEY = 'orbit:webhook:dlq';
// How many jobs to pick up per poll cycle
const POLL_BATCH_SIZE = 50;
// Poll interval: check the sorted set every 500 ms
const POLL_INTERVAL_MS = 500;

@Injectable()
export class WebhookRetryQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookRetryQueueService.name);
  private redis: Redis | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('[WebhookRetry] REDIS_URL not set — retry queue disabled');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.redis.on('error', (err) =>
        this.logger.warn(`[WebhookRetry] Redis error: ${err.message}`),
      );
      this.redis.connect().catch((err) =>
        this.logger.warn(`[WebhookRetry] Could not connect to Redis: ${err.message}`),
      );
      this.pollTimer = setInterval(() => void this.processQueue(), POLL_INTERVAL_MS);
      this.logger.log('[WebhookRetry] Retry queue started');
    } catch (err) {
      this.logger.warn(`[WebhookRetry] Failed to initialize Redis: ${err}`);
    }
  }

  onModuleDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.redis?.disconnect();
  }

  /**
   * Schedules a webhook for retry. Called by NotificationsService after the
   * initial delivery attempt fails.
   *
   * @param webhookUrl - The Slack incoming-webhook URL
   * @param payload    - The original AlertPayload (used to reconstruct the body on retry)
   * @param channelId  - The NotificationChannel id (for logging / idempotency)
   * @param idempotencyKey - The same key used in the notification log
   */
  async enqueue(
    webhookUrl: string,
    payload: AlertPayload,
    channelId: string,
    idempotencyKey: string,
  ): Promise<void> {
    if (!this.redis) {
      this.logger.warn('[WebhookRetry] Redis unavailable — skipping retry');
      return;
    }

    const job: WebhookRetryJob = {
      id: randomUUID(),
      webhookUrl,
      payload,
      attempt: 0,
      channelId,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    await this.scheduleJob(job);
    this.logger.log(
      `[WebhookRetry] Queued retry job ${job.id} for channel ${channelId} (attempt 1/${MAX_RETRIES})`,
    );
  }

  private async scheduleJob(job: WebhookRetryJob): Promise<void> {
    if (!this.redis) return;

    const delayMs = RETRY_DELAYS_MS[job.attempt];
    const processAt = Date.now() + delayMs;

    await this.redis.zadd(RETRY_QUEUE_KEY, processAt, JSON.stringify(job));
  }

  /**
   * Polls the sorted set for jobs whose score (processAt) is ≤ now,
   * pops them atomically, and fires the webhook.
   * Keeps a transaction window so no two workers pick the same job.
   */
  private async processQueue(): Promise<void> {
    if (!this.redis) return;

    const now = Date.now();

    // ZRANGEBYSCORE + ZREM must be atomic — use a Lua script
    const luaScript = `
      local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2])
      if #jobs == 0 then return {} end
      redis.call('ZREM', KEYS[1], unpack(jobs))
      return jobs
    `;

    let rawJobs: string[];
    try {
      const result = await this.redis.eval(
        luaScript,
        1,
        RETRY_QUEUE_KEY,
        String(now),
        String(POLL_BATCH_SIZE),
      );
      rawJobs = Array.isArray(result) ? (result as string[]) : [];
    } catch (err) {
      this.logger.warn(`[WebhookRetry] Queue poll failed: ${err}`);
      return;
    }

    for (const raw of rawJobs) {
      let job: WebhookRetryJob;
      try {
        job = JSON.parse(raw) as WebhookRetryJob;
      } catch {
        this.logger.warn('[WebhookRetry] Discarding malformed job from queue');
        continue;
      }

      await this.executeJob(job);
    }
  }

  private async executeJob(job: WebhookRetryJob): Promise<void> {
    const overallAttempt = job.attempt + 2; // +1 for initial, +1 because attempt is 0-indexed

    try {
      const res = await fetch(job.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.buildSlackBody(job.payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      this.logger.log(
        `[WebhookRetry] Delivery succeeded on attempt ${overallAttempt} for job ${job.id}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const nextAttempt = job.attempt + 1;

      if (nextAttempt >= MAX_RETRIES) {
        await this.moveToDLQ(job, message);
        this.logger.warn(
          `[WebhookRetry] Job ${job.id} moved to DLQ after ${MAX_RETRIES} retries. Last error: ${message}`,
        );
      } else {
        const nextJob: WebhookRetryJob = { ...job, attempt: nextAttempt };
        await this.scheduleJob(nextJob);
        this.logger.warn(
          `[WebhookRetry] Job ${job.id} attempt ${overallAttempt} failed (${message}). ` +
          `Scheduling retry ${nextAttempt + 1}/${MAX_RETRIES} in ${RETRY_DELAYS_MS[nextAttempt]}ms`,
        );
      }
    }
  }

  private buildSlackBody(payload: AlertPayload): string {
    const color = payload.color
      ?? (payload.event.includes('fail') || payload.event.includes('rollback')
        ? '#f87171'
        : '#22c55e');

    return JSON.stringify({
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${payload.event}* — \`${payload.releaseVersion}\` on *${payload.environment}*`,
              },
            },
            { type: 'section', text: { type: 'mrkdwn', text: payload.message } },
            payload.triggeredBy && {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Triggered by ${payload.triggeredBy}` }],
            },
          ].filter(Boolean),
        },
      ],
    });
  }

  private async moveToDLQ(job: WebhookRetryJob, lastError: string): Promise<void> {
    if (!this.redis) return;

    const dlqEntry = {
      ...job,
      failedAt: new Date().toISOString(),
      lastError,
    };

    // LPUSH so newest failures appear at the head; trim to 10 000 entries to prevent unbounded growth
    await this.redis.lpush(DLQ_KEY, JSON.stringify(dlqEntry));
    await this.redis.ltrim(DLQ_KEY, 0, 9_999);
  }

  /** Returns the first N entries from the dead-letter queue (newest first). */
  async listDLQ(limit = 100): Promise<Array<WebhookRetryJob & { failedAt: string; lastError: string }>> {
    if (!this.redis) return [];
    const raw = await this.redis.lrange(DLQ_KEY, 0, limit - 1);
    return raw.map((r) => {
      try { return JSON.parse(r) as WebhookRetryJob & { failedAt: string; lastError: string }; }
      catch { return null; }
    }).filter((j): j is WebhookRetryJob & { failedAt: string; lastError: string } => j !== null);
  }

  /** Returns the current size of the retry queue and DLQ. */
  async queueStats(): Promise<{ retryQueueSize: number; dlqSize: number }> {
    if (!this.redis) return { retryQueueSize: 0, dlqSize: 0 };
    const [retryQueueSize, dlqSize] = await Promise.all([
      this.redis.zcard(RETRY_QUEUE_KEY),
      this.redis.llen(DLQ_KEY),
    ]);
    return { retryQueueSize, dlqSize };
  }
}
