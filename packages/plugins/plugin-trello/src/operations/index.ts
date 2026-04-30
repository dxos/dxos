//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./get-trello-boards'),
  () => import('./sync-trello-board'),
);

export * as TrelloOperation from './definitions';
export { GetTrelloBoards, SyncTrelloBoard } from './definitions';
export const TrelloHandlers = Handlers;
