//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as LinearOperation from '../types/LinearOperation';

export const LinearOperationHandlerSet = OperationHandlerSet.keyed([
  [LinearOperation.GetLinearTeams, () => import('./get-teams')],
  [LinearOperation.MaterializeLinearTarget, () => import('./materialize-target')],
  [LinearOperation.SyncLinearTeams, () => import('./sync')],
]);
