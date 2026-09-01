//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RoutineOperation } from '#types';

export const RoutineOperationHandlerSet = OperationHandlerSet.lazy([
  RoutineOperation.CreateTriggerFromTemplate.pipe(
    Operation.lazyHandler(() => import('./create-trigger-from-template.ts')),
  ),
  RoutineOperation.CreateRoutine.pipe(Operation.lazyHandler(() => import('./create-routine.ts'))),
  RoutineOperation.RunRoutine.pipe(Operation.lazyHandler(() => import('./run-routine.ts'))),
]);
