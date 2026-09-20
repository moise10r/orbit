import { Injectable, Logger } from '@nestjs/common';
import { GitHubApiClient, GitHubRelease } from './github-api.client';
import { GitHubConnectionService } from './github-connection.service';
import { PendingRelease, IncomingReleaseStatus } from './github-webhook.service';

export interface SyncResult {
  serviceId: string;
  imported: number;
  skipped: number;
  releases: PendingRelease[];
}

@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);

  constructor(
    private readonly connections: GitHubConnectionService,
    private readonly api: GitHubApiClient,
  ) {}

  async syncReleasesForService(serviceId: string): Promise<SyncResult> {
    const connection = await this.connections.findByService(serviceId);
    const token = this.connections.decryptToken(connection);

    const ghReleases = await this.api.listReleases(
      connection.repoOwner,
      connection.repoName,
      token,
    );

    const publishedReleases = ghReleases.filter((r) => !r.draft);

    const releases: PendingRelease[] = publishedReleases.map((r: GitHubRelease) => ({
      serviceId,
      version: r.tag_name,
      notes: r.body,
      commitSha: r.target_commitish,
      environment: r.prerelease ? 'staging' : 'production',
      status: IncomingReleaseStatus.DEPLOYED,
      deployedAt: r.published_at ? new Date(r.published_at) : null,
      source: 'github_release' as const,
    }));

    this.logger.log(
      `Sync ${connection.repoOwner}/${connection.repoName}: ${releases.length} releases ready to import`,
    );

    return {
      serviceId,
      imported: releases.length,
      skipped: ghReleases.length - publishedReleases.length,
      releases,
    };
  }
}
