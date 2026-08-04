//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { Fetch } from './definitions';

export * as WebSearchOperations from './definitions';

export const WebSearchHandlers = OperationHandlerSet.keyed([[Fetch, () => import('./fetch')]]);
