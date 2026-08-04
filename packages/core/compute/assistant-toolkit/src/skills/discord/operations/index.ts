//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FetchMessages } from './definitions';

export * as DiscordOperations from './definitions';

export const DiscordHandlers = OperationHandlerSet.keyed([[FetchMessages, () => import('./fetch-messages')]]);
