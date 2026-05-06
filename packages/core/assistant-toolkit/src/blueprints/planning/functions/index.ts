//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const PlanningHandlers = OperationHandlerSet.lazy(() => import('./update-tasks'));
