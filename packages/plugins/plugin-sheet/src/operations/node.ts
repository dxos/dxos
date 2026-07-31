//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

// The operations `SheetPlugin.node` can serve, and only those. `scroll-to-anchor` drives a live
// editor view, so it is browser-only — and `OperationHandlerSet.lazy` defers the import at runtime
// without stopping a bundler walking into the React surface behind it.

export const SheetOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./drop-axis'),
  () => import('./get-values'),
  () => import('./insert-axis'),
  () => import('./restore-axis'),
  () => import('./set-values'),
);
