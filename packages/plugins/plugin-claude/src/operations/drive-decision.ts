//
// Copyright 2026 DXOS.org
//

/** The label that stands in for an approving review: the agent's PR is authored with the person's own token. */
export const LAND_LABEL = 'land';

/** The Agentic Review check is advisory: its failure is a finding for the person, never a reason to hold a merge. */
const ADVISORY_CHECK = /^agentic review/i;

/**
 * A failure the agent cannot fix by code: a draft run superseded by the ready run, which a rerun of the ready run
 * clears.
 */
const UNFIXABLE_CHECK = /^stale draft run/i;

/** Most follow-ups of one kind sent for one head commit: the first, then re-prompts when its turn ended without a push. */
export const MAX_ATTEMPTS = 3;

export type FailedCheck = { name: string; url?: string };

/** What the decision needs to know of one pull request, folded from GitHub's status. */
export type PullRequestSnapshot = {
  url: string;
  state: 'draft' | 'open' | 'closed' | 'merged';
  /** The head commit; follow-ups are per commit, so a push re-arms them. */
  commit?: string;
  /** Checks that failed on the head commit, the advisory one left out. */
  failed: readonly FailedCheck[];
  /** An approving review from anyone, or the `land` label. */
  approved: boolean;
};

/** The slice of `GetPullRequestStatus`'s output a snapshot is made from. */
export type PullRequestStatusLike = {
  state: PullRequestSnapshot['state'];
  commit?: string;
  runs: readonly { name: string; outcome: string; conclusion?: string; url?: string }[];
  review: string;
  labels: readonly string[];
};

/** A cancelled run is a superseded duplicate, not a failure of the code. */
const isFailure = (run: PullRequestStatusLike['runs'][number]): boolean =>
  run.outcome === 'failure' && run.conclusion !== 'cancelled';

export const toSnapshot = (url: string, status: PullRequestStatusLike): PullRequestSnapshot => ({
  url,
  state: status.state,
  ...(status.commit !== undefined && { commit: status.commit }),
  failed: status.runs
    .filter((run) => isFailure(run) && !ADVISORY_CHECK.test(run.name) && !UNFIXABLE_CHECK.test(run.name))
    .map((run) => ({ name: run.name, ...(run.url !== undefined && { url: run.url }) })),
  approved: status.review === 'approved' || status.labels.some((label) => label.toLowerCase() === LAND_LABEL),
});

export type FollowUp = 'fix' | 'land';

export type Action =
  | { _tag: 'none' }
  | { _tag: 'merged' }
  | {
      _tag: FollowUp;
      pullRequests: readonly PullRequestSnapshot[];
      /** Which send this is for each pull request's head commit, by URL: 1 is the first. */
      attempts: ReadonlyMap<string, number>;
    };

/** The record of one follow-up sent: per pull request, head commit, kind and attempt; the first has no suffix. */
export const sentKey = (pullRequest: PullRequestSnapshot, kind: FollowUp, attempt = 1): string =>
  `${pullRequest.url}@${pullRequest.commit ?? ''}#${kind}${attempt > 1 ? `.${attempt}` : ''}`;

/** The attempt to send next for a pull request's head commit, or `undefined` once {@link MAX_ATTEMPTS} are spent. */
const nextAttempt = (
  sent: ReadonlySet<string>,
  pullRequest: PullRequestSnapshot,
  kind: FollowUp,
): number | undefined => {
  let attempt = 1;
  while (attempt <= MAX_ATTEMPTS && sent.has(sentKey(pullRequest, kind, attempt))) {
    attempt++;
  }
  return attempt <= MAX_ATTEMPTS ? attempt : undefined;
};

const pending = (
  pullRequests: readonly PullRequestSnapshot[],
  sent: ReadonlySet<string>,
  kind: FollowUp,
): { pullRequests: PullRequestSnapshot[]; attempts: Map<string, number> } => {
  const attempts = new Map<string, number>();
  const due = pullRequests.filter((pullRequest) => {
    const attempt = nextAttempt(sent, pullRequest, kind);
    if (attempt !== undefined) {
      attempts.set(pullRequest.url, attempt);
    }
    return attempt !== undefined;
  });
  return { pullRequests: due, attempts };
};

/**
 * What to do for a run: nothing while its turn runs; tasks done once every pull request has merged; otherwise a
 * follow-up that names failed checks, or one that lands the approved pull requests while nothing has failed. The
 * same follow-up for the same pull request and commit is sent again, when the turn ended without a push, up to
 * {@link MAX_ATTEMPTS} times in all.
 */
export const decide = (input: {
  running: boolean;
  pullRequests: readonly PullRequestSnapshot[];
  sent: ReadonlySet<string>;
}): Action => {
  const { running, pullRequests, sent } = input;
  if (running || pullRequests.length === 0) {
    return { _tag: 'none' };
  }
  if (pullRequests.every((pullRequest) => pullRequest.state === 'merged')) {
    return { _tag: 'merged' };
  }
  const open = pullRequests.filter((pullRequest) => pullRequest.state === 'open' || pullRequest.state === 'draft');
  const failing = open.filter((pullRequest) => pullRequest.failed.length > 0);
  if (failing.length > 0) {
    // Landing is held back while a failure stands, whether or not its re-prompts are spent.
    const due = pending(failing, sent, 'fix');
    return due.pullRequests.length > 0 ? { _tag: 'fix', ...due } : { _tag: 'none' };
  }
  const due = pending(
    open.filter((pullRequest) => pullRequest.approved),
    sent,
    'land',
  );
  return due.pullRequests.length > 0 ? { _tag: 'land', ...due } : { _tag: 'none' };
};

/** The line that tells the agent a follow-up repeats: its last turn ended and the head commit did not move. */
const retryLine = (attempt: number, what: string): string =>
  `This is attempt ${attempt} of ${MAX_ATTEMPTS}: ${what} on the same commit. End this turn with a push, or with a concrete reason it cannot be done by code.`;

const attemptLines = (
  pullRequests: readonly PullRequestSnapshot[],
  attempts: ReadonlyMap<string, number> | undefined,
  what: string,
): string[] => {
  const attempt = Math.max(1, ...pullRequests.map((pullRequest) => attempts?.get(pullRequest.url) ?? 1));
  return attempt > 1 ? ['', retryLine(attempt, what)] : [];
};

export const fixPrompt = (
  pullRequests: readonly PullRequestSnapshot[],
  attempts?: ReadonlyMap<string, number>,
): string =>
  [
    'CI failed on the head commit of your pull request. Read the failures, fix them, and push to the same branch:',
    ...pullRequests.flatMap((pullRequest) => [
      `- ${pullRequest.url}`,
      ...pullRequest.failed.map((check) => `  - ${check.name}${check.url ? `: ${check.url}` : ''}`),
    ]),
    ...attemptLines(pullRequests, attempts, 'the checks are still red'),
  ].join('\n');

export const landPrompt = (
  pullRequests: readonly PullRequestSnapshot[],
  attempts?: ReadonlyMap<string, number>,
): string =>
  [
    `The person approved landing ${pullRequests.length === 1 ? 'this pull request' : 'these pull requests'}:`,
    ...pullRequests.map((pullRequest) => `- ${pullRequest.url}`),
    '',
    'For each: bring the branch up to date with its base if it is behind, wait for its checks with',
    '`gh pr checks --watch`, and fix and push if any fail. The Agentic Review check is advisory and never blocks.',
    'Then run `gh pr merge --auto --squash` and wait until it has merged. Report when it has, or why it could not.',
    ...attemptLines(pullRequests, attempts, 'the pull request has still not merged'),
  ].join('\n');
