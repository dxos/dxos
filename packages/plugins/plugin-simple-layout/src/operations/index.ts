// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/operation';

export const SimpleLayoutOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./close'),
  () => import('./open'),
  () => import('./revert-workspace'),
  () => import('./set'),
  () => import('./set-layout-mode'),
  () => import('./switch-workspace'),
  () => import('./update-complementary'),
  () => import('./update-dialog'),
  () => import('./update-popover'),
  () => import('./update-sidebar'),
);
