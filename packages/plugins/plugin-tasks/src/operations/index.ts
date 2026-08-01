//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const TasksOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./assign-task'),
  () => import('./complete-task'),
  () => import('./convert-to-task'),
  () => import('./create-outline'),
  () => import('./create-task'),
  () => import('./quick-entry'),
  () => import('./update-task'),
);
