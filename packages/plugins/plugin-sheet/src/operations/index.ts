//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SheetOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./drop-axis'),
  () => import('./get-values'),
  () => import('./insert-axis'),
  () => import('./restore-axis'),
  () => import('./scroll-to-anchor'),
  () => import('./set-values'),
);
