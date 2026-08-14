//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RoutineOperation } from '#types';

export const RoutineOperationHandlerSet = OperationHandlerSet.lazy([
  RoutineOperation.CreateTriggerFromTemplate.pipe(
    Operation.lazyHandler(() => import('./create-trigger-from-template')),
  ),
  RoutineOperation.CreateRoutine.pipe(Operation.lazyHandler(() => import('./create-routine'))),
  RoutineOperation.RunRoutine.pipe(Operation.lazyHandler(() => import('./run-routine'))),
]);
