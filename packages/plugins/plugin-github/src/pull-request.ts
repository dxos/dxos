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
});
