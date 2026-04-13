//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./move'),
  () => import('./ai-move'),
  () => import('./print'),
);

export { Create, MakeMove, AiMove, Print } from './definitions';

export const TicTacToeHandlers = Handlers;
