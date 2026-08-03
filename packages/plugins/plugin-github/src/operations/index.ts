//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as GitHubOperation from '../types/GitHubOperation';

export const GitHubOperationHandlerSet = OperationHandlerSet.keyed([
  [GitHubOperation.GetGitHubRepositories, () => import('./get-repositories')],
  [GitHubOperation.MaterializeGitHubTarget, () => import('./materialize-target')],
  [GitHubOperation.SyncGitHubRepositories, () => import('./sync')],
]);
