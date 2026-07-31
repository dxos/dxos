//
// Copyright 2024 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ChessOperation } from '../types';

export const ChessOperationHandlerSet = OperationHandlerSet.keyed([
  [ChessOperation.Move, () => import('./move')],
  [ChessOperation.Play, () => import('./play')],
  [ChessOperation.Print, () => import('./print')],
  [ChessOperation.RebuildPositionIndex, () => import('./rebuild-position-index')],
]);
