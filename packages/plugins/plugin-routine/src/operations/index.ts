//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { RoutineOperation } from '../types';

export const RoutineOperationHandlerSet = OperationHandlerSet.keyed([
  [RoutineOperation.CreateTriggerFromTemplate, () => import('./create-trigger-from-template')],
  [RoutineOperation.CreateRoutine, () => import('./create-routine')],
  [RoutineOperation.RunRoutine, () => import('./run-routine')],
]);
