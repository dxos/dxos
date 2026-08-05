//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetBlueskyTargets, MaterializeBlueskyTarget, SyncBlueskyTargets } from './definitions';

export const BlueskyHandlers = OperationHandlerSet.lazy([
  GetBlueskyTargets.pipe(Operation.lazyHandler(() => import('./get-bluesky-targets'))),
  MaterializeBlueskyTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  SyncBlueskyTargets.pipe(Operation.lazyHandler(() => import('./sync'))),
]);

export * as BlueskyOperation from './definitions';
