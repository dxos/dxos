//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ChessComOperation } from '../types';

export const ChessComOperationHandlerSet = OperationHandlerSet.keyed([
  [ChessComOperation.SyncGames, () => import('./sync-games')],
  [ChessComOperation.ClearSyncedGames, () => import('./clear-synced-games')],
]);
