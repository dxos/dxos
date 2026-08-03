//
// Copyright 2024 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ChessOperation from '../types/ChessOperation';

export const ChessOperationHandlerSet = OperationHandlerSet.keyed([
  [ChessOperation.Move, () => import('./move')],
  [ChessOperation.Play, () => import('./play')],
  [ChessOperation.Print, () => import('./print')],
  [ChessOperation.RebuildPositionIndex, () => import('./rebuild-position-index')],
]);
