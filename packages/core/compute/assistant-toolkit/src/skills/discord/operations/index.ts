//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FetchMessages } from './definitions';

export * as DiscordOperations from './definitions';

export const DiscordHandlers = OperationHandlerSet.lazy([
  FetchMessages.pipe(Operation.lazyHandler(() => import('./fetch-messages'))),
]);
