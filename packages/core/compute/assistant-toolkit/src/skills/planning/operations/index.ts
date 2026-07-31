//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as PlanningOperations from './definitions';

export const PlanningHandlers = OperationHandlerSet.lazy(
  () => import('./update-tasks'),
  () => import('./plan-reminder'),
);
