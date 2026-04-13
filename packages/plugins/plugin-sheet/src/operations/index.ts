//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as SheetOperation from './definitions';

export const SheetOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./drop-axis'),
  () => import('./insert-axis'),
  () => import('./restore-axis'),
  () => import('./scroll-to-anchor'),
);
