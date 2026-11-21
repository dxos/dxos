//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { type PrStatus, type PullRequest } from './types.ts';

/** A PR's state as GitHub reports it; `merge queue` and `landing` are not visible there, so the session file says them. */
export type GithubPr = {
  status: Extract<PrStatus, 'draft' | 'open' | 'failing' | 'merged' | 'closed'>;
  branch: string;
};

type Cache = Record<string, { fetchedAt: number; pr: GithubPr }>;

/** Long enough that a run of Stop hooks shares one lookup, short enough that the page follows CI within minutes. */
const TTL_MS = 2 * 60_000;

const FAILED = new Set(['failure', 'timed_out', 'action_required']);

type Pull = { state: string; draft: boolean; merged_at: string | null; head: { ref: string; sha: string } };
type CheckRuns = { check_runs: { conclusion: string | null }[] };

const request = async <T>(path: string): Promise<T> => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      'accept': 'application/vnd.github+json',
      'user-agent': 'dxos-session-board',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub ${path}: ${response.status}`);
  }
  return response.json();
};

const fetchPr = async (ref: string): Promise<GithubPr> => {
  const [, owner, repo, number] = ref.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/) ?? [];
  const pull = await request<Pull>(`/repos/${owner}/${repo}/pulls/${number}`);
  const branch: string = pull.head.ref;
  if (pull.merged_at) {
    return { status: 'merged', branch };
  }
  if (pull.state === 'closed') {
    return { status: 'closed', branch };
  }
  const checks = await request<CheckRuns>(`/repos/${owner}/${repo}/commits/${pull.head.sha}/check-runs?per_page=100`);
  const failing = checks.check_runs.some((run) => FAILED.has(run.conclusion ?? ''));
  return { status: failing ? 'failing' : pull.draft ? 'draft' : 'open', branch };
};

/**
 * Each PR's status and branch from GitHub, cached in `cacheFile` for {@link TTL_MS}. A PR the lookup cannot reach keeps
 * what the session file says, and the problem is returned as a warning rather than failing the build.
 */
export const githubState = async (
  prs: readonly PullRequest[],
  cacheFile: string,
): Promise<{ state: Map<string, GithubPr>; warnings: string[] }> => {
  // Written only by this module, so it is not validated again.
  const cache: Cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  const state = new Map<string, GithubPr>();
  const warnings: string[] = [];
  const now = Date.now();
  await Promise.all(
    prs.map(async ({ ref }) => {
      const cached = Object.hasOwn(cache, ref) ? cache[ref] : undefined;
      if (cached && now - cached.fetchedAt < TTL_MS) {
        state.set(ref, cached.pr);
        return;
      }
      try {
        const pr = await fetchPr(ref);
        cache[ref] = { fetchedAt: now, pr };
        state.set(ref, pr);
      } catch (error) {
        // An expired entry is not used: it could undo a state the file already records, such as `merged`.
        warnings.push(`${ref}: ${error instanceof Error ? error.message : String(error)}; using the state in the file`);
      }
    }),
  );
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  return { state, warnings };
};

/**
 * GitHub's state wins, except that `landing` and `queued` (states GitHub does not show) stand while GitHub still says
 * the PR is open or failing, since the `land` skill is then still driving it.
 */
export const mergeState = (pr: PullRequest, github: GithubPr | undefined): PullRequest => {
  if (!github) {
    return pr;
  }
  const agentOnly =
    (pr.status === 'landing' || pr.status === 'queued') && (github.status === 'open' || github.status === 'failing');
  return { ...pr, status: agentOnly ? pr.status : github.status, branch: pr.branch ?? github.branch };
};
