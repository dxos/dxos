//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as GitHubOperation from '../types/GitHubOperation';

export const GitHubOperationHandlerSet = OperationHandlerSet.lazy([
  GitHubOperation.GetGitHubRepositories.pipe(Operation.lazyHandler(() => import('./get-repositories'))),
  GitHubOperation.MaterializeGitHubTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  GitHubOperation.SyncGitHubRepositories.pipe(Operation.lazyHandler(() => import('./sync'))),
]);
