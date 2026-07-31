//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SheetOperation } from '../types';

export const SheetOperationHandlerSet = OperationHandlerSet.keyed([
  [SheetOperation.Create, () => import('./create')],
  [SheetOperation.DropAxis, () => import('./drop-axis')],
  [SheetOperation.GetValues, () => import('./get-values')],
  [SheetOperation.InsertAxis, () => import('./insert-axis')],
  [SheetOperation.RestoreAxis, () => import('./restore-axis')],
  [SheetOperation.ScrollToAnchor, () => import('./scroll-to-anchor')],
  [SheetOperation.SetValues, () => import('./set-values')],
]);
