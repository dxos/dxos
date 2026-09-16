//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { TrelloOperation } from '#types';

export const TrelloOperationHandlerSet = OperationHandlerSet.lazy([
  TrelloOperation.GetTrelloBoards.pipe(Operation.lazyHandler(() => import('./get-trello-boards.ts'))),
  TrelloOperation.MaterializeTrelloTarget.pipe(Operation.lazyHandler(() => import('./materialize-target.ts'))),
  TrelloOperation.SyncTrelloBoard.pipe(Operation.lazyHandler(() => import('./sync.ts'))),
]);
