//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ConnectorOperation from '../types/ConnectorOperation';

export const ConnectorOperationHandlerSet = OperationHandlerSet.keyed([
  [ConnectorOperation.CreateConnection, () => import('./create-connection')],
  [ConnectorOperation.SyncConnection, () => import('./sync-connection')],
]);
