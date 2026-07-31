//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { LinearOperation } from '../types';

export const LinearOperationHandlerSet = OperationHandlerSet.keyed([
  [LinearOperation.GetLinearTeams, () => import('./get-teams')],
  [LinearOperation.MaterializeLinearTarget, () => import('./materialize-target')],
  [LinearOperation.SyncLinearTeams, () => import('./sync')],
]);
