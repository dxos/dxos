//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const DiscordHandlers = OperationHandlerSet.lazy(() => import('./fetch-messages'));
