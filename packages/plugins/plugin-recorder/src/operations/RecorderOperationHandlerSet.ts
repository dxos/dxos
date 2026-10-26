//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RecorderOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  RecorderOperation.DeleteTake.pipe(Operation.lazyHandler(() => import('./delete-take.ts'))),
  RecorderOperation.RestoreTake.pipe(Operation.lazyHandler(() => import('./restore-take.ts'))),
  RecorderOperation.SelectTake.pipe(Operation.lazyHandler(() => import('./select-take.ts'))),
]);
