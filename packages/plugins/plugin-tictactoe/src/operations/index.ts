//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const TicTacToeOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./move'),
  () => import('./ai-move'),
  () => import('./print'),
);
