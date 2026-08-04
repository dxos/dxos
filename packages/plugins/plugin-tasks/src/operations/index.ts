//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const TasksOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./assign-task'),
  () => import('./complete-task'),
  () => import('./convert-to-task'),
  () => import('./create-outline'),
  () => import('./get-outline'),
  () => import('./create-task'),
  () => import('./list-tasks'),
  () => import('./quick-entry'),
  () => import('./update-outline'),
  () => import('./update-task'),
);
