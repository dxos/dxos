//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DebugOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  DebugOperation.InsertLoremIpsum.pipe(Operation.lazyHandler(() => import('./insert-lorem-ipsum'))),
  DebugOperation.Snapshot.pipe(Operation.lazyHandler(() => import('./snapshot'))),
  DebugOperation.CreateSampleSpace.pipe(Operation.lazyHandler(() => import('./create-sample-space'))),
]);
