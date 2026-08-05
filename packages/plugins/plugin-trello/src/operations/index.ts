//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as TrelloOperation from '../types/TrelloOperation';

export const TrelloOperationHandlerSet = OperationHandlerSet.lazy([
  TrelloOperation.GetTrelloBoards.pipe(Operation.lazyHandler(() => import('./get-trello-boards'))),
  TrelloOperation.MaterializeTrelloTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  TrelloOperation.SyncTrelloBoard.pipe(Operation.lazyHandler(() => import('./sync'))),
]);
