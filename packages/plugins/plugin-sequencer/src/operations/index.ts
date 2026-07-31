//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ScoreOperation } from '../types';

export const SequencerOperationHandlerSet = OperationHandlerSet.keyed([
  [ScoreOperation.Read, () => import('./read')],
  [ScoreOperation.Write, () => import('./write')],
]);
