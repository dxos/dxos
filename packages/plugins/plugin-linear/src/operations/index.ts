//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { LinearOperation } from '#types';

export const LinearOperationHandlerSet = OperationHandlerSet.lazy([
  LinearOperation.GetLinearTeams.pipe(Operation.lazyHandler(() => import('./get-teams.ts'))),
  LinearOperation.MaterializeLinearTarget.pipe(Operation.lazyHandler(() => import('./materialize-target.ts'))),
  LinearOperation.SyncLinearTeams.pipe(Operation.lazyHandler(() => import('./sync.ts'))),
]);
