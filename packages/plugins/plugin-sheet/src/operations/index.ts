//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SheetOperation from '../types/SheetOperation';

export const SheetOperationHandlerSet = OperationHandlerSet.lazy([
  SheetOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  SheetOperation.DropAxis.pipe(Operation.lazyHandler(() => import('./drop-axis'))),
  SheetOperation.GetValues.pipe(Operation.lazyHandler(() => import('./get-values'))),
  SheetOperation.InsertAxis.pipe(Operation.lazyHandler(() => import('./insert-axis'))),
  SheetOperation.RestoreAxis.pipe(Operation.lazyHandler(() => import('./restore-axis'))),
  SheetOperation.ScrollToAnchor.pipe(Operation.lazyHandler(() => import('./scroll-to-anchor'))),
  SheetOperation.SetValues.pipe(Operation.lazyHandler(() => import('./set-values'))),
]);
