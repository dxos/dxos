//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { TrelloOperation } from '../types';

export const TrelloOperationHandlerSet = OperationHandlerSet.keyed([
  [TrelloOperation.GetTrelloBoards, () => import('./get-trello-boards')],
  [TrelloOperation.MaterializeTrelloTarget, () => import('./materialize-target')],
  [TrelloOperation.SyncTrelloBoard, () => import('./sync')],
]);
