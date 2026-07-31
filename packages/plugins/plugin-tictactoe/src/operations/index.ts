//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { TicTacToeOperation } from '../types';

export const TicTacToeOperationHandlerSet = OperationHandlerSet.keyed([
  [TicTacToeOperation.MakeMove, () => import('./move')],
  [TicTacToeOperation.AiMove, () => import('./ai-move')],
  [TicTacToeOperation.Print, () => import('./print')],
]);
