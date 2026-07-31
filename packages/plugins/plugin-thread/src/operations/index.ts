//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ThreadOperation } from '../types';

export const ThreadOperationHandlerSet = OperationHandlerSet.keyed([
  [ThreadOperation.AppendChannelMessage, () => import('./append-channel-message')],
  [ThreadOperation.CreateChannel, () => import('./create-channel')],
]);
