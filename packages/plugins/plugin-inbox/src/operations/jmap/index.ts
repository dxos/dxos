//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Send from './send';
import Sync from './sync';

export const JmapFunctions: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const JmapHandlers = OperationHandlerSet.lazy(
  () => import('./send'),
  () => import('./sync'),
);
