//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const DailySummaryHandlers = OperationHandlerSet.lazy(() => import('./generate'));
