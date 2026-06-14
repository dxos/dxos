//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const MarkdownOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./accept-change'),
  () => import('./create'),
  () => import('./create-markdown'),
  () => import('./open'),
  () => import('./scroll-to-anchor'),
  () => import('./set-view-mode'),
  () => import('./update-markdown'),
);
