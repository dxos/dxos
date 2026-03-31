//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./move'),
  () => import('./play'),
  () => import('./print'),
);

export { Create, Move, Play, Print } from './definitions';

export const ChessHandlers = Handlers;
