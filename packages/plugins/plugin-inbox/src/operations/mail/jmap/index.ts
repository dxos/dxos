//
// Copyright 2026 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as InboxOperation from '../../../types/InboxOperation';
import Send from './send';
import Sync from './sync';

export const JmapOperations: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const JmapHandlers = OperationHandlerSet.keyed([
  [InboxOperation.JmapSend, () => import('./send')],
  [InboxOperation.JmapSync, () => import('./sync')],
]);
