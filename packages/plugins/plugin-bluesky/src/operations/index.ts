//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const BlueskyHandlers = OperationHandlerSet.lazy(
  () => import('./get-bluesky-targets'),
  () => import('./materialize-target'),
  () => import('./sync'),
);

export * as BlueskyOperation from './definitions';
