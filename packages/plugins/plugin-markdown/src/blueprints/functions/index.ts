//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const MarkdownHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./open'),
  () => import('./update'),
);
