//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { GitHub } from '@dxos/plugin-github/types';

import { Demo } from '../../types';

/** GitHub REST proxy (configured in composer-app's vite.config). */
const GITHUB_API_BASE = '/api/github';

export type PrPollerConfig = {
  /** GitHub PAT with `public_repo` scope. */
  pat: string;
  /** Repo to poll, in `owner/name` form. */
  repo: string;
};

type ApiPr = {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  user?: { login: string };
};

/** Fetch the last N closed PRs (most recent first), including merged-ness. */
const fetchRecentClosedPrs = async (config: PrPollerConfig, perPage = 20): Promise<ApiPr[]> => {
  const url = `${GITHUB_API_BASE}/repos/${config.repo}/pulls?state=closed&per_page=${perPage}&sort=updated&direction=desc`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.pat}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as ApiPr[];
};

/**
 * One-shot PR poll. Upserts GitHubPullRequest objects and, for *newly*
 * merged PRs (i.e., ones whose corresponding stored object had no mergedAt
 * before this tick), emits a `pr-merged` DemoEvent so the existing nudge
 * observer fires. The first tick against a fresh repo seeds the store
 * silently — no nudges for historical merges.
 */
export const pollMergedPullRequests = async (
  db: Database.Database,
  config: PrPollerConfig,
): Promise<{ upserted: number; newlyMerged: number }> => {
  const remote = await fetchRecentClosedPrs(config);
  const existing = await db.query(Filter.type(GitHub.GitHubPullRequest)).run();
  const byKey = new Map<string, GitHub.GitHubPullRequest>();
  for (const pr of existing) {
    byKey.set(`${pr.fullName}#${pr.number}`, pr);
  }

  const firstSync = remote.length > 0 && existing.filter((pr) => pr.fullName === config.repo).length === 0;
  let upserted = 0;
  let newlyMerged = 0;

  for (const apiPr of remote) {
    const key = `${config.repo}#${apiPr.number}`;
    const stored = byKey.get(key);
    const wasMerged = Boolean(stored?.mergedAt);
    const isMerged = Boolean(apiPr.merged_at);
    const bodyTrimmed = (apiPr.body ?? '').slice(0, 4000);

    if (stored) {
      Obj.change(stored, (mutable) => {
        mutable.title = apiPr.title;
        mutable.body = bodyTrimmed;
        mutable.state = apiPr.state;
        mutable.mergedAt = apiPr.merged_at ?? undefined;
        mutable.updatedAt = apiPr.updated_at;
        mutable.author = apiPr.user?.login;
      });
    } else {
      db.add(
        Obj.make(GitHub.GitHubPullRequest, {
          fullName: config.repo,
          number: apiPr.number,
          title: apiPr.title,
          body: bodyTrimmed,
          state: apiPr.state,
          mergedAt: apiPr.merged_at ?? undefined,
          createdAt: apiPr.created_at,
          updatedAt: apiPr.updated_at,
          url: apiPr.html_url,
          author: apiPr.user?.login,
        }),
      );
    }
    upserted += 1;

    // Fire a nudge only on the transition from not-merged to merged, and
    // only after the initial seeding tick. The first poll against a fresh
    // repo silently captures history without spamming old PRs.
    if (!firstSync && isMerged && !wasMerged) {
      const keywords = extractKeywords(apiPr.title, bodyTrimmed);
      db.add(
        Demo.makeEvent({
          kind: 'pr-merged',
          label: `GitHub PR #${apiPr.number} merged: ${apiPr.title}`,
          payload: {
            number: apiPr.number,
            repo: config.repo,
            title: apiPr.title,
            author: apiPr.user?.login,
            url: apiPr.html_url,
            mergedAt: apiPr.merged_at,
            relatedKeywords: keywords,
          },
        }),
      );
      newlyMerged += 1;
    }
  }

  if (firstSync && remote.length > 0) {
    log.info('demo: pr-poller seeded history', { repo: config.repo, count: remote.length });
  } else if (newlyMerged > 0) {
    log.info('demo: pr-poller detected merges', { repo: config.repo, newlyMerged });
  }
  return { upserted, newlyMerged };
};

/**
 * Best-effort keyword extraction from a PR title + body. Stopwords removed,
 * short tokens dropped. Used to match merged PRs against Trello-card names.
 */
const extractKeywords = (title: string, body: string): string[] => {
  const text = `${title}\n${body}`.toLowerCase();
  const raw = text.match(/[a-z][a-z0-9-]{3,}/g) ?? [];
  const stopwords = new Set([
    'fix', 'feat', 'chore', 'refactor', 'docs', 'test', 'build',
    'from', 'with', 'into', 'that', 'this', 'have', 'been', 'will',
    'when', 'then', 'also', 'only', 'just', 'were', 'should', 'could',
    'would', 'about', 'after', 'before', 'during', 'again',
  ]);
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const token of raw) {
    if (stopwords.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    keywords.push(token);
    if (keywords.length >= 10) {
      break;
    }
  }
  return keywords;
};
