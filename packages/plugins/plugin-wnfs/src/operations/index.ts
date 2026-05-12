//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const WnfsOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./create-file'),
  () => import('./upload'),
);
