//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Send from './send';
import Sync from './sync';

export const JmapOperations: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const JmapHandlers = OperationHandlerSet.lazy(
  () => import('./materialize-target'),
  () => import('./send'),
  () => import('./sync'),
);
