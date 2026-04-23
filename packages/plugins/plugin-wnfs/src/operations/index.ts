//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as WnfsOperation from './definitions';

export const WnfsOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./create-file'),
  () => import('./upload'),
);
