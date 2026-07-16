//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const GitHubOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-repositories'),
  () => import('./get-pull-request-diff'),
  () => import('./materialize-target'),
  () => import('./sync'),
);
