//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as PlanningOperations from './definitions';

export const PlanningHandlers = OperationHandlerSet.lazy(
  () => import('./update-tasks'),
  () => import('./plan-reminder'),
);
