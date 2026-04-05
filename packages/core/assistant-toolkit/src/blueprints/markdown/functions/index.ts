//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const MarkdownHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./open'),
  () => import('./read'),
  () => import('./update'),
);
