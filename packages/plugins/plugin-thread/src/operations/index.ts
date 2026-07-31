//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ThreadOperation } from '../types';

export const ThreadOperationHandlerSet = OperationHandlerSet.keyed([
  [ThreadOperation.AppendChannelMessage, () => import('./append-channel-message')],
  [ThreadOperation.CreateChannel, () => import('./create-channel')],
]);
