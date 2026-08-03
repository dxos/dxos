//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as TrelloOperation from '../types/TrelloOperation';

export const TrelloOperationHandlerSet = OperationHandlerSet.keyed([
  [TrelloOperation.GetTrelloBoards, () => import('./get-trello-boards')],
  [TrelloOperation.MaterializeTrelloTarget, () => import('./materialize-target')],
  [TrelloOperation.SyncTrelloBoard, () => import('./sync')],
]);
