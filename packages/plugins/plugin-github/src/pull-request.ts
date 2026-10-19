//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import { type PullRequestReference } from './github-link.ts';
import { type GitHubApi } from './services/index.ts';

/** Where a pull request lives on github.com, for a reference that carried no URL of its own. */
export const pullRequestUrl = ({ owner, repo, number }: PullRequestReference): string =>
  `https://github.com/${owner}/${repo}/pull/${number}`;

/**
 * GitHub's pull payload as the fields a local {@link PullRequest.PullRequest} holds.
 *
 * Shared by the link preview and the import command so the two cannot disagree about what a pull
 * request looks like once it is in a space.
 */
export const toPullRequestProps = (
  reference: PullRequestReference & { url?: string },
  pull: GitHubApi.GitHubPull,
): Obj.MakeProps<typeof PullRequest.PullRequest> => ({
  owner: reference.owner,
  repo: reference.repo,
  number: reference.number,
  title: pull.title,
  url: pull.html_url ?? reference.url ?? pullRequestUrl(reference),
  // `merged_at` as well as `merged`: the list endpoints carry only the timestamp.
  state: pull.merged || pull.merged_at ? 'merged' : pull.draft ? 'draft' : pull.state === 'closed' ? 'closed' : 'open',
  author: pull.user?.login,
  description: pull.body ?? undefined,
  baseBranch: pull.base?.ref,
  headBranch: pull.head?.ref,
  additions: pull.additions,
  deletions: pull.deletions,
  createdAt: pull.created_at ?? undefined,
  updatedAt: pull.updated_at ?? undefined,
});

/** Fields a re-sync may overwrite; the coordinates and URL name the pull request and never drift. */
const SYNCED_FIELDS = [
  'title',
  'state',
  'author',
  'description',
  'baseBranch',
  'headBranch',
  'additions',
  'deletions',
  'createdAt',
  'updatedAt',
] as const;

type SyncedField = (typeof SYNCED_FIELDS)[number];

export type PullRequestChanges = Partial<Pick<PullRequest.PullRequest, SyncedField>>;

/**
 * The fields where GitHub's payload differs from the stored pull request, so a re-sync writes only
 * what changed and an unchanged pull request costs no mutation.
 *
 * A field GitHub's payload leaves out is kept rather than cleared: an absent value is unknown, not empty.
 */
export const pullRequestChanges = (
  pullRequest: PullRequest.PullRequest,
  pull: GitHubApi.GitHubPull,
): PullRequestChanges => {
  const next = toPullRequestProps(pullRequest, pull);
  const changes: PullRequestChanges = {};
  const copy = <Field extends SyncedField>(field: Field) => {
    const value = next[field];
    if (value !== undefined && value !== pullRequest[field]) {
      changes[field] = value;
    }
  };
  SYNCED_FIELDS.forEach(copy);
  return changes;
};
