//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ChessComOperation } from '../types';

export const ChessComOperationHandlerSet = OperationHandlerSet.keyed([
  [ChessComOperation.SyncGames, () => import('./sync-games')],
  [ChessComOperation.ClearSyncedGames, () => import('./clear-synced-games')],
]);
