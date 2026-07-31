//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScoreOperation } from '../types';

export const SequencerOperationHandlerSet = OperationHandlerSet.keyed([
  [ScoreOperation.Read, () => import('./read')],
  [ScoreOperation.Write, () => import('./write')],
]);
