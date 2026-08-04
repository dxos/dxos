//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SheetOperation from '../types/SheetOperation';

// The operations `SheetPlugin.node` can serve, and only those. `scroll-to-anchor` drives a live
// editor view, so it is browser-only — and `OperationHandlerSet.keyed` defers the import at runtime
// without stopping a bundler walking into the React surface behind it.

export const SheetOperationHandlerSet = OperationHandlerSet.keyed([
  [SheetOperation.Create, () => import('./create')],
  [SheetOperation.DropAxis, () => import('./drop-axis')],
  [SheetOperation.GetValues, () => import('./get-values')],
  [SheetOperation.InsertAxis, () => import('./insert-axis')],
  [SheetOperation.RestoreAxis, () => import('./restore-axis')],
  [SheetOperation.SetValues, () => import('./set-values')],
]);
