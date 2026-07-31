//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GitHubOperation } from '../types';

export const GitHubOperationHandlerSet = OperationHandlerSet.keyed([
  [GitHubOperation.GetGitHubRepositories, () => import('./get-repositories')],
  [GitHubOperation.MaterializeGitHubTarget, () => import('./materialize-target')],
  [GitHubOperation.SyncGitHubRepositories, () => import('./sync')],
]);
