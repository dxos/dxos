//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SlackOperation } from '#types';

export const SlackOperationHandlerSet = OperationHandlerSet.lazy([
  SlackOperation.GetSlackChannels.pipe(Operation.lazyHandler(() => import('./get-slack-channels'))),
  SlackOperation.MaterializeSlackTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  SlackOperation.SyncSlackChannel.pipe(Operation.lazyHandler(() => import('./sync'))),
]);
