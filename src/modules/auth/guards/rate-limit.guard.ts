import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from '@nestjs/common';
import { LDClient } from 'launchdarkly-node-server-sdk';
import { InjectLDClient } from '../../../common/launchdarkly/launchdarkly.decorator';
import { EventBusService } from '../../../common/event-bus/event-bus.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @InjectLDClient() private readonly ldClient: LDClient,
    private readonly eventBus: EventBusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const now = Date.now();

    const flagValue = await this.ldClient.variation(
      'orbit.auth.rate_limit',
      { key: 'server', anonymous: true },
      { limit: 10, windowMs: 60000 },
    );

    const limit: number = flagValue?.limit ?? 10;
    const windowMs: number = flagValue?.windowMs ?? 60000;

    const countKey = `rate_limit:${ip}`;
    const windowStart = now - windowMs;

    await this.eventBus.publish('rate-limit.record', {
      ip,
      timestamp: now,
    });

    const timestamps: number[] = await this.eventBus.query('rate-limit.timestamps', {
      ip,
      windowStart,
    });

    const recentCount = timestamps.length;

    if (recentCount >= limit) {
      throw new TooManyRequestsException();
    }

    return true;
  }
}