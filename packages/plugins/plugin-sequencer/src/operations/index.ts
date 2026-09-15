//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScoreOperation } from '#types';

export const SequencerOperationHandlerSet = OperationHandlerSet.lazy([
  ScoreOperation.Read.pipe(Operation.lazyHandler(() => import('./read.ts'))),
  ScoreOperation.Write.pipe(Operation.lazyHandler(() => import('./write.ts'))),
]);
