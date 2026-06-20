//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const OutlinerOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-outline'),
  () => import('./quick-entry'),
);
