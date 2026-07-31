//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { TicTacToeOperation } from '../types';

export const TicTacToeOperationHandlerSet = OperationHandlerSet.keyed([
  [TicTacToeOperation.MakeMove, () => import('./move')],
  [TicTacToeOperation.AiMove, () => import('./ai-move')],
  [TicTacToeOperation.Print, () => import('./print')],
]);
