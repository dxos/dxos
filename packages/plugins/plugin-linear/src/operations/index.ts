//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as LinearOperation from '../types/LinearOperation';

export const LinearOperationHandlerSet = OperationHandlerSet.lazy([
  LinearOperation.GetLinearTeams.pipe(Operation.lazyHandler(() => import('./get-teams'))),
  LinearOperation.MaterializeLinearTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  LinearOperation.SyncLinearTeams.pipe(Operation.lazyHandler(() => import('./sync'))),
]);
