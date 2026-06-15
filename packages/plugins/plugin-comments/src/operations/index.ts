//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CommentOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./accept-change'),
  () => import('./add-message'),
  () => import('./create'),
  () => import('./create-proposals'),
  () => import('./delete'),
  () => import('./delete-message'),
  () => import('./respond-to-thread'),
  () => import('./restore'),
  () => import('./restore-message'),
  () => import('./select'),
  () => import('./set-agent-config'),
  () => import('./toggle-resolved'),
);
