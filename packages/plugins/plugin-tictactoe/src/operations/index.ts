//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./move'),
  () => import('./ai-move'),
  () => import('./print'),
);

export { MakeMove, AiMove, Print } from './definitions';

export const TicTacToeHandlers = Handlers;
