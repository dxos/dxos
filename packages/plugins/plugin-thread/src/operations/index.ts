//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ThreadOperation } from '#types';

export const ThreadOperationHandlerSet = OperationHandlerSet.lazy([
  ThreadOperation.AppendChannelMessage.pipe(Operation.lazyHandler(() => import('./append-channel-message.ts'))),
  ThreadOperation.CreateChannel.pipe(Operation.lazyHandler(() => import('./create-channel.ts'))),
  ThreadOperation.SendToChannel.pipe(Operation.lazyHandler(() => import('./send-to-channel.ts'))),
  ThreadOperation.OpenDirect.pipe(Operation.lazyHandler(() => import('./open-direct.ts'))),
  ThreadOperation.ConnectChannel.pipe(Operation.lazyHandler(() => import('./connect-channel.ts'))),
  ThreadOperation.DisconnectChannel.pipe(Operation.lazyHandler(() => import('./disconnect-channel.ts'))),
  ThreadOperation.GetChannelStatus.pipe(Operation.lazyHandler(() => import('./get-channel-status.ts'))),
]);
