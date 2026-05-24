import { Injectable, Logger } from '@nestjs/common';

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  target_commitish: string;
  published_at: string | null;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { date: string } };
  html_url: string;
}

@Injectable()
export class GitHubApiClient {
  private readonly logger = new Logger(GitHubApiClient.name);
  private readonly baseUrl = 'https://api.github.com';

  private headers(token?: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async listReleases(owner: string, repo: string, token?: string): Promise<GitHubRelease[]> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/releases?per_page=50`;
    const res = await fetch(url, { headers: this.headers(token) });

    if (!res.ok) {
      this.logger.warn(`GitHub API ${res.status} for ${owner}/${repo}/releases`);
      return [];
    }

    return res.json() as Promise<GitHubRelease[]>;
  }

  async getCommit(owner: string, repo: string, sha: string, token?: string): Promise<GitHubCommit | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${sha}`;
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) return null;
    return res.json() as Promise<GitHubCommit>;
  }
}
