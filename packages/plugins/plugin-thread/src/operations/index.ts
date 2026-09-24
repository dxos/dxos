//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ThreadOperation } from '#types';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy([
  ThreadOperation.AppendChannelMessage.pipe(Operation.lazyHandler(() => import('./append-channel-message.ts'))),
  ThreadOperation.CreateChannel.pipe(Operation.lazyHandler(() => import('./create-channel.ts'))),
]);
