//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as DeckOperation from './definitions';

export const DeckOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-toast'),
  () => import('./adjust'),
  () => import('./change-companion'),
  () => import('./close'),
  () => import('./open'),
  () => import('./revert-workspace'),
  () => import('./scroll-into-view'),
  () => import('./set'),
  () => import('./set-layout-mode'),
  () => import('./show-undo'),
  () => import('./switch-workspace'),
  () => import('./update-complementary'),
  () => import('./update-dialog'),
  () => import('./update-plank-size'),
  () => import('./update-popover'),
  () => import('./update-sidebar'),
);
