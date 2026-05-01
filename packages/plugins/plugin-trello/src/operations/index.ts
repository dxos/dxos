//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';
export * as TrelloAPI from './trello-api';

export const TrelloHandlers = OperationHandlerSet.lazy(
  () => import('./push-card'),
  () => import('./sync-board'),
);
