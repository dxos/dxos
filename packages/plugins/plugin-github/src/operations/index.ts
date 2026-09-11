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
]);
