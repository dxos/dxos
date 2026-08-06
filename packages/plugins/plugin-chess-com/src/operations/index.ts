//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ChessComOperation from '../types/ChessComOperation';

export const ChessComOperationHandlerSet = OperationHandlerSet.lazy([
  ChessComOperation.SyncGames.pipe(Operation.lazyHandler(() => import('./sync-games'))),
  ChessComOperation.ClearSyncedGames.pipe(Operation.lazyHandler(() => import('./clear-synced-games'))),
]);
