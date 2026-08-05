//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ScoreOperation from '../types/ScoreOperation';

export const SequencerOperationHandlerSet = OperationHandlerSet.lazy([
  ScoreOperation.Read.pipe(Operation.lazyHandler(() => import('./read'))),
  ScoreOperation.Write.pipe(Operation.lazyHandler(() => import('./write'))),
]);
