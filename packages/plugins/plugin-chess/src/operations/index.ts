//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ChessOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./move'),
  () => import('./play'),
  () => import('./print'),
);
