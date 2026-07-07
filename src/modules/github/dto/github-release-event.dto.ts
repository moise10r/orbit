// Subset of the GitHub release webhook payload we actually use.
// Full schema: https://docs.github.com/en/webhooks/webhook-events-and-payloads#release
export interface GitHubReleasePayload {
  action: 'published' | 'created' | 'edited' | 'deleted' | 'prereleased' | 'released';
  release: {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    target_commitish: string;
    html_url: string;
    published_at: string | null;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
  };
}

export interface GitHubPushPayload {
  ref: string;
  after: string;
  repository: {
    name: string;
    full_name: string;
    owner: { login?: string; name?: string };
  };
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
  } | null;
}
