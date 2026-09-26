//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GitHubOperation } from '#types';

export const GitHubOperationHandlerSet = OperationHandlerSet.lazy([
  GitHubOperation.GetGitHubRepositories.pipe(Operation.lazyHandler(() => import('./get-repositories.ts'))),
  GitHubOperation.MaterializeGitHubTarget.pipe(Operation.lazyHandler(() => import('./materialize-target.ts'))),
  GitHubOperation.SyncGitHubRepositories.pipe(Operation.lazyHandler(() => import('./sync.ts'))),
  GitHubOperation.GenerateWalkthrough.pipe(Operation.lazyHandler(() => import('./generate-walkthrough.ts'))),
  GitHubOperation.ImportPullRequest.pipe(Operation.lazyHandler(() => import('./import-pull-request.ts'))),
  GitHubOperation.ImportPullRequestFromSnapshot.pipe(
    Operation.lazyHandler(() => import('./import-pull-request-from-snapshot.ts')),
  ),
  GitHubOperation.SubmitPullRequestApproval.pipe(
    Operation.lazyHandler(() => import('./submit-pull-request-approval.ts')),
  ),
  GitHubOperation.AddPullRequestComment.pipe(Operation.lazyHandler(() => import('./add-pull-request-comment.ts'))),
  GitHubOperation.AddPullRequestReviewComment.pipe(
    Operation.lazyHandler(() => import('./add-pull-request-review-comment.ts')),
  ),
  GitHubOperation.GetPullRequestStatus.pipe(Operation.lazyHandler(() => import('./get-pull-request-status.ts'))),
  GitHubOperation.GetPullRequestDiff.pipe(Operation.lazyHandler(() => import('./get-pull-request-diff.ts'))),
]);
