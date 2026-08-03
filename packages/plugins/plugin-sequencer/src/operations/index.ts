//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ScoreOperation from '../types/ScoreOperation';

export const SequencerOperationHandlerSet = OperationHandlerSet.keyed([
  [ScoreOperation.Read, () => import('./read')],
  [ScoreOperation.Write, () => import('./write')],
]);
