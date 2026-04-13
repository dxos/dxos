//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const MarkdownHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./read'),
  () => import('./update'),
);
