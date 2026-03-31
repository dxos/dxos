//
// Copyright 2024 DXOS.org
//

import type { Operation } from '@dxos/operation';
import { OperationHandlerSet } from '@dxos/operation';

import Send from './send';
import Sync from './sync';

export const GmailFunctions: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const GmailHandlers = OperationHandlerSet.lazy(
  () => import('./send'),
  () => import('./sync'),
);
