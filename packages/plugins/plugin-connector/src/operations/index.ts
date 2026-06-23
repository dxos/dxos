//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ConnectorOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-connection'),
  () => import('./sync-connection'),
);
