//
// Copyright 2024 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as InboxOperation from '../../../types/InboxOperation';
import Send from './send';
import Sync from './sync';

export const GmailFunctions: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
  Sync,
};

export const GmailHandlers = OperationHandlerSet.keyed([
  [InboxOperation.GmailSend, () => import('./send')],
  [InboxOperation.GoogleMailSync, () => import('./sync')],
]);
