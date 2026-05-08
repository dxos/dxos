//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import ConnectTest from './connect-test';
import Sync from './sync';

export const ImapFunctions: {
  Sync: Operation.WithHandler<Operation.Definition.Any>;
  ConnectTest: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Sync,
  ConnectTest,
};

export const ImapHandlers = OperationHandlerSet.lazy(
  () => import('./connect-test'),
  () => import('./sync'),
);
