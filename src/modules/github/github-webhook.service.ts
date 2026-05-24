import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GitHubPushPayload,
  GitHubReleasePayload,
} from './dto/github-release-event.dto';
import { GitHubConnection } from './entities/github-connection.entity';
import { GitHubConnectionService } from './github-connection.service';

export enum IncomingReleaseStatus {
  PENDING = 'pending',
  DEPLOYED = 'deployed',
}

export interface PendingRelease {
  serviceId: string;
  version: string;
  notes: string | null;
  commitSha: string;
  environment: string;
  status: IncomingReleaseStatus;
  deployedAt: Date | null;
  source: 'github_release' | 'github_push';
}

@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger(GitHubWebhookService.name);

  constructor(
    private readonly connections: GitHubConnectionService,
    @InjectRepository(GitHubConnection)
    private readonly connectionRepo: Repository<GitHubConnection>,
  ) {}

  async handleReleaseEvent(payload: GitHubReleasePayload): Promise<PendingRelease | null> {
    if (payload.action !== 'published' && payload.action !== 'released') return null;
    if (payload.release.draft) return null;

    const { owner, name: repo } = payload.repository.owner
      ? { owner: payload.repository.owner.login, name: payload.repository.name }
      : { owner: '', name: '' };

    const connection = await this.connections.findByRepo(owner, repo);
    if (!connection) {
      this.logger.warn(`No active connection for ${owner}/${repo} — ignoring release event`);
      return null;
    }

    const release = payload.release;
    return {
      serviceId: connection.serviceId,
      version: release.tag_name,
      notes: release.body,
      commitSha: release.target_commitish,
      environment: 'production',
      status: IncomingReleaseStatus.DEPLOYED,
      deployedAt: release.published_at ? new Date(release.published_at) : null,
      source: 'github_release',
    };
  }

  async handlePushEvent(payload: GitHubPushPayload): Promise<PendingRelease | null> {
    const owner = payload.repository.owner?.login ?? payload.repository.owner?.name ?? '';
    const repo = payload.repository.name;

    const connection = await this.connections.findByRepo(owner, repo);
    if (!connection) return null;

    const branch = payload.ref.replace('refs/heads/', '');
    if (branch !== connection.defaultBranch) return null;
    if (!payload.head_commit) return null;

    return {
      serviceId: connection.serviceId,
      version: payload.after.slice(0, 7),
      notes: payload.head_commit.message,
      commitSha: payload.after,
      environment: 'staging',
      status: IncomingReleaseStatus.PENDING,
      deployedAt: null,
      source: 'github_push',
    };
  }
}
