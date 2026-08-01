//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const BrainOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./query-facts'),
  () => import('./summarize-subject'),
  () => import('./generate-reply'),
);
