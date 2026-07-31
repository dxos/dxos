//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ConnectorOperation } from '../types';

export const ConnectorOperationHandlerSet = OperationHandlerSet.keyed([
  [ConnectorOperation.CreateConnection, () => import('./create-connection')],
  [ConnectorOperation.SyncConnection, () => import('./sync-connection')],
]);
