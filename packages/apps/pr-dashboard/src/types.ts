export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
  draft: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  auto_merge: {
    enabled_by: {
      login: string;
    };
  } | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
}

export interface PRWithDetails extends PullRequest {
  checks: CheckRun[];
  aiSummary?: string;
  keepClean?: boolean;
}

export interface Settings {
  repo: string;
  owner: string;
  anthropicApiKey: string;
  refreshInterval: number;
}
