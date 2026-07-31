//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SyncBlueskyTargets } from './definitions';
import { MaterializeBlueskyTarget } from './definitions';
import { GetBlueskyTargets } from './definitions';

export const BlueskyHandlers = OperationHandlerSet.keyed([
  [GetBlueskyTargets, () => import('./get-bluesky-targets')],
  [MaterializeBlueskyTarget, () => import('./materialize-target')],
  [SyncBlueskyTargets, () => import('./sync')],
]);

export * as BlueskyOperation from './definitions';
