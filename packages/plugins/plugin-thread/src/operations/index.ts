//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as ThreadOperation from './definitions';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-message'),
  () => import('./create'),
  () => import('./create-channel'),
  () => import('./create-channel-thread'),
  () => import('./create-proposals'),
  () => import('./delete'),
  () => import('./delete-message'),
  () => import('./on-create-space'),
  () => import('./restore'),
  () => import('./restore-message'),
  () => import('./select'),
  () => import('./toggle-resolved'),
);
