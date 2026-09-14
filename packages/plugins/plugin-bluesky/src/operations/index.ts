//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetBlueskyTargets, MaterializeBlueskyTarget, SyncBlueskyTargets } from './definitions.ts';

export const BlueskyHandlers = OperationHandlerSet.lazy([
  GetBlueskyTargets.pipe(Operation.lazyHandler(() => import('./get-bluesky-targets.ts'))),
  MaterializeBlueskyTarget.pipe(Operation.lazyHandler(() => import('./materialize-target.ts'))),
  SyncBlueskyTargets.pipe(Operation.lazyHandler(() => import('./sync.ts'))),
]);

export * as BlueskyOperation from './definitions.ts';
