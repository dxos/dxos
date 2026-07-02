//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const LinearOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-teams'),
  () => import('./materialize-target'),
  () => import('./sync'),
);
