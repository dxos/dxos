//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ThreadOperation from '../types/ThreadOperation';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy([
  ThreadOperation.AppendChannelMessage.pipe(Operation.lazyHandler(() => import('./append-channel-message'))),
  ThreadOperation.CreateChannel.pipe(Operation.lazyHandler(() => import('./create-channel'))),
]);
