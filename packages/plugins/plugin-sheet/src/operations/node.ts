//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SheetOperation } from '#types';

// The operations a headless entry (`SheetPlugin.node`, and workerd via the `#operations` condition)
// can serve, and only those. `scroll-to-anchor` drives a live
// editor view, so it is browser-only — and `OperationHandlerSet.lazy` defers the import at runtime
// without stopping a bundler walking into the React surface behind it.

export const SheetOperationHandlerSet = OperationHandlerSet.lazy([
  SheetOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  SheetOperation.DropAxis.pipe(Operation.lazyHandler(() => import('./drop-axis'))),
  SheetOperation.GetValues.pipe(Operation.lazyHandler(() => import('./get-values'))),
  SheetOperation.InsertAxis.pipe(Operation.lazyHandler(() => import('./insert-axis'))),
  SheetOperation.RestoreAxis.pipe(Operation.lazyHandler(() => import('./restore-axis'))),
  SheetOperation.SetValues.pipe(Operation.lazyHandler(() => import('./set-values'))),
]);
