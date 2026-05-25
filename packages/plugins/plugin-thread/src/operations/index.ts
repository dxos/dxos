//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-message'),
  () => import('./append-channel-message'),
  () => import('./create'),
  () => import('./create-channel'),
  () => import('./create-proposals'),
  () => import('./delete'),
  () => import('./delete-message'),
  () => import('./on-create-space'),
  () => import('./respond-to-thread'),
  () => import('./restore'),
  () => import('./restore-message'),
  () => import('./select'),
  () => import('./set-agent-config'),
  () => import('./toggle-resolved'),
);
