//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const DeckOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-toast'),
  () => import('./adjust'),
  () => import('./close'),
  () => import('./open'),
  () => import('./revert-workspace'),
  () => import('./scroll-into-view'),
  () => import('./set'),
  () => import('./switch-workspace'),
  () => import('./toggle-expose'),
  () => import('./update-companion'),
  () => import('./update-complementary'),
  () => import('./update-dialog'),
  () => import('./update-plank-size'),
  () => import('./update-plank-sizes'),
  () => import('./update-popover'),
  () => import('./update-sidebar'),
);
