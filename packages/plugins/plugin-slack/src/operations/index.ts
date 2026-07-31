//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SlackOperation } from '../types';

export const SlackOperationHandlerSet = OperationHandlerSet.keyed([
  [SlackOperation.GetSlackChannels, () => import('./get-slack-channels')],
  [SlackOperation.MaterializeSlackTarget, () => import('./materialize-target')],
  [SlackOperation.SyncSlackChannel, () => import('./sync')],
]);
