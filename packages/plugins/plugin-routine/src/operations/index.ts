//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const RoutineOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-trigger-from-template'),
  () => import('./create-routine'),
  () => import('./run-automation'),
);
