//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ConnectorOperation } from '#types';

export const ConnectorOperationHandlerSet = OperationHandlerSet.lazy([
  ConnectorOperation.CreateConnection.pipe(Operation.lazyHandler(() => import('./create-connection.ts'))),
]);
