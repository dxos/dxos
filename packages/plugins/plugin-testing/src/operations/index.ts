//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const TestingOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./switch-workspace'),
  () => import('./update-complementary'),
  () => import('./update-dialog'),
  () => import('./update-popover'),
  () => import('./update-sidebar'),
);
