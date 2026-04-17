//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as DealFlowOperation from './definitions';

export const DealFlowHandlers = OperationHandlerSet.lazy(
  () => import('./enrich-deal'),
  () => import('./scan-signals'),
  () => import('./generate-assessment'),
  () => import('./query-deals'),
);
