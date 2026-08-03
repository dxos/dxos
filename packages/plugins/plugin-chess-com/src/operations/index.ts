//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ChessComOperation from '../types/ChessComOperation';

export const ChessComOperationHandlerSet = OperationHandlerSet.keyed([
  [ChessComOperation.SyncGames, () => import('./sync-games')],
  [ChessComOperation.ClearSyncedGames, () => import('./clear-synced-games')],
]);
