//
// Copyright 2024 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ChessOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  ChessOperation.Move.pipe(Operation.lazyHandler(() => import('./move'))),
  ChessOperation.Play.pipe(Operation.lazyHandler(() => import('./play'))),
  ChessOperation.Print.pipe(Operation.lazyHandler(() => import('./print'))),
  ChessOperation.RebuildPositionIndex.pipe(Operation.lazyHandler(() => import('./rebuild-position-index'))),
]);
