//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./append-channel-message'),
  () => import('./create-channel'),
  () => import('./create-thread'),
  () => import('./remove-channel-message'),
  () => import('./rename-thread'),
  () => import('./set-thread-name'),
  () => import('./toggle-reaction'),
);
