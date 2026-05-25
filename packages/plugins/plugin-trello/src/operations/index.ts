//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const TrelloOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-trello-boards'),
  () => import('./sync'),
);
