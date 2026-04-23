//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as MarkdownOperation from './definitions';

export const MarkdownOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./create-markdown'),
  () => import('./open'),
  () => import('./scroll-to-anchor'),
  () => import('./set-view-mode'),
  () => import('./update'),
);
