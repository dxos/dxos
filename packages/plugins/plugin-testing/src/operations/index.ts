//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const TestingOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-toast'),
  () => import('./close'),
  () => import('./open'),
  () => import('./scroll-into-view'),
  () => import('./set-layout-mode'),
  () => import('./switch-workspace'),
  () => import('./update-complementary'),
  () => import('./update-dialog'),
  () => import('./update-popover'),
  () => import('./update-sidebar'),
);
