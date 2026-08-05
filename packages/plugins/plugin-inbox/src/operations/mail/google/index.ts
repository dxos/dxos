//
// Copyright 2024 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
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

export const GmailHandlers = OperationHandlerSet.lazy([
  InboxOperation.GmailSend.pipe(Operation.lazyHandler(() => import('./send'))),
  InboxOperation.GoogleMailSync.pipe(Operation.lazyHandler(() => import('./sync'))),
]);
