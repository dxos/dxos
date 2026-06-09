//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as PlanningOperations from './update-tasks';

export const PlanningHandlers = OperationHandlerSet.lazy(() => import('./update-tasks'));
