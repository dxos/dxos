//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./move'),
  () => import('./play'),
  () => import('./print'),
);

export { Move, Play, Print } from './definitions';

export const ChessHandlers = Handlers;
