//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ThreadOperation from '../types/ThreadOperation';

export const ThreadOperationHandlerSet = OperationHandlerSet.keyed([
  [ThreadOperation.AppendChannelMessage, () => import('./append-channel-message')],
  [ThreadOperation.CreateChannel, () => import('./create-channel')],
]);
