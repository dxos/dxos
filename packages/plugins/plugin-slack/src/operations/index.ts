//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SlackOperation from '../types/SlackOperation';

export const SlackOperationHandlerSet = OperationHandlerSet.keyed([
  [SlackOperation.GetSlackChannels, () => import('./get-slack-channels')],
  [SlackOperation.MaterializeSlackTarget, () => import('./materialize-target')],
  [SlackOperation.SyncSlackChannel, () => import('./sync')],
]);
