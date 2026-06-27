//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Send from './mail/send';
import Sync from './mail/sync';

export const JmapOperations: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const JmapHandlers = OperationHandlerSet.lazy(
  () => import('./mail/materialize-target'),
  () => import('./mail/send'),
  () => import('./mail/sync'),
  // TODO: () => import('./calendar/...'),
  // TODO: () => import('./contacts/...'),
);
