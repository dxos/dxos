//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SlackOperation } from '../types';

export const SlackOperationHandlerSet = OperationHandlerSet.keyed([
  [SlackOperation.GetSlackChannels, () => import('./get-slack-channels')],
  [SlackOperation.MaterializeSlackTarget, () => import('./materialize-target')],
  [SlackOperation.SyncSlackChannel, () => import('./sync')],
]);
