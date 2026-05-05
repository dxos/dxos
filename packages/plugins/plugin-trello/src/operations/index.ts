//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const TrelloHandlers = OperationHandlerSet.lazy(
  () => import('./get-trello-boards'),
  () => import('./sync'),
);

export * as TrelloOperation from './definitions';
