//
// Copyright 2026 DXOS.org
//

/** The label that stands in for an approving review: the agent's PR is authored with the person's own token. */
export const LAND_LABEL = 'land';

/** The Agentic Review check is advisory: its failure is a finding for the person, never a reason to hold a merge. */
const ADVISORY_CHECK = /^agentic review/i;

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
  runs: readonly { name: string; outcome: string; url?: string }[];
  review: string;
  labels: readonly string[];
};

export const toSnapshot = (url: string, status: PullRequestStatusLike): PullRequestSnapshot => ({
  url,
  state: status.state,
  ...(status.commit !== undefined && { commit: status.commit }),
  failed: status.runs
    .filter((run) => run.outcome === 'failure' && !ADVISORY_CHECK.test(run.name))
    .map((run) => ({ name: run.name, ...(run.url !== undefined && { url: run.url }) })),
  approved: status.review === 'approved' || status.labels.some((label) => label.toLowerCase() === LAND_LABEL),
});

export type FollowUp = 'fix' | 'land';

export type Action =
  | { _tag: 'none' }
  | { _tag: 'merged' }
  | { _tag: FollowUp; pullRequests: readonly PullRequestSnapshot[] };

/** The record of one follow-up sent: once per pull request, head commit and kind. */
export const sentKey = (pullRequest: PullRequestSnapshot, kind: FollowUp): string =>
  `${pullRequest.url}@${pullRequest.commit ?? ''}#${kind}`;

/**
 * What to do for a run: nothing while its turn runs; tasks done once every pull request has merged; otherwise a
 * follow-up that names failed checks, or one that lands the approved pull requests while nothing has failed. A
 * follow-up already sent for the same pull request and commit is not sent again.
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
    // A failure already reported waits for the agent's push, so landing is held back either way.
    const unsent = failing.filter((pullRequest) => !sent.has(sentKey(pullRequest, 'fix')));
    return unsent.length > 0 ? { _tag: 'fix', pullRequests: unsent } : { _tag: 'none' };
  }
  const landing = open.filter((pullRequest) => pullRequest.approved && !sent.has(sentKey(pullRequest, 'land')));
  return landing.length > 0 ? { _tag: 'land', pullRequests: landing } : { _tag: 'none' };
};

export const fixPrompt = (pullRequests: readonly PullRequestSnapshot[]): string =>
  [
    'CI failed on the head commit of your pull request. Read the failures, fix them, and push to the same branch:',
    ...pullRequests.flatMap((pullRequest) => [
      `- ${pullRequest.url}`,
      ...pullRequest.failed.map((check) => `  - ${check.name}${check.url ? `: ${check.url}` : ''}`),
    ]),
  ].join('\n');

export const landPrompt = (pullRequests: readonly PullRequestSnapshot[]): string =>
  [
    `The person approved landing ${pullRequests.length === 1 ? 'this pull request' : 'these pull requests'}:`,
    ...pullRequests.map((pullRequest) => `- ${pullRequest.url}`),
    '',
    'For each: bring the branch up to date with its base if it is behind, wait for its checks with',
    '`gh pr checks --watch`, and fix and push if any fail. The Agentic Review check is advisory and never blocks.',
    'Then run `gh pr merge --auto --squash` and wait until it has merged. Report when it has, or why it could not.',
  ].join('\n');
