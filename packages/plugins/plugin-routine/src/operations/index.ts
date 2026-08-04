//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as RoutineOperation from '../types/RoutineOperation';

export const RoutineOperationHandlerSet = OperationHandlerSet.keyed([
  [RoutineOperation.CreateTriggerFromTemplate, () => import('./create-trigger-from-template')],
  [RoutineOperation.CreateRoutine, () => import('./create-routine')],
  [RoutineOperation.RunRoutine, () => import('./run-routine')],
]);
