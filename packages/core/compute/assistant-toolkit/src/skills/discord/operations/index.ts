//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as DiscordOperations from './definitions';

export const DiscordHandlers = OperationHandlerSet.lazy(() => import('./fetch-messages'));
