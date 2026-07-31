//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { TrelloOperation } from '../types';

export const TrelloOperationHandlerSet = OperationHandlerSet.keyed([
  [TrelloOperation.GetTrelloBoards, () => import('./get-trello-boards')],
  [TrelloOperation.MaterializeTrelloTarget, () => import('./materialize-target')],
  [TrelloOperation.SyncTrelloBoard, () => import('./sync')],
]);
