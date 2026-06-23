//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as PlanningOperations from './update-tasks';
export { PlanReminder } from './plan-reminder';

export const PlanningHandlers = OperationHandlerSet.lazy(
  () => import('./update-tasks'),
  () => import('./plan-reminder'),
);
