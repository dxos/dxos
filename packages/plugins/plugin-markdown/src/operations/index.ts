//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const MarkdownOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./accept-change'),
  () => import('./create'),
  () => import('./create-branch'),
  () => import('./create-checkpoint'),
  () => import('./create-markdown'),
  () => import('./get-history'),
  () => import('./get-selection'),
  () => import('./merge-branch'),
  () => import('./open'),
  () => import('./reject-change'),
  () => import('./restore-text'),
  () => import('./scroll-to-anchor'),
  () => import('./suggest-edit'),
  () => import('./update-markdown'),
);
