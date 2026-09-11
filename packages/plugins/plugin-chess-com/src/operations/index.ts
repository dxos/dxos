//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ChessComOperation } from '#types';

export const ChessComOperationHandlerSet = OperationHandlerSet.lazy([
  ChessComOperation.SyncGames.pipe(Operation.lazyHandler(() => import('./sync-games.ts'))),
  ChessComOperation.ClearSyncedGames.pipe(Operation.lazyHandler(() => import('./clear-synced-games.ts'))),
]);
