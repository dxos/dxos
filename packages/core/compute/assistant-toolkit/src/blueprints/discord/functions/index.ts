//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const DiscordHandlers = OperationHandlerSet.lazy(() => import('./fetch-messages'));
