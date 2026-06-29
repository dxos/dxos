//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

/** Combined handler set for all IBKR operations; provided to the Composer operation registry. */
export const IbkrOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./sync-portfolio'),
  () => import('./get-portfolio'),
  () => import('./get-trades'),
  () => import('./materialize-instrument'),
  () => import('./get-instrument-fundamentals'),
);
