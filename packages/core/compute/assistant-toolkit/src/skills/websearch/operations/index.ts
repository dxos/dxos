//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as WebSearchOperations from './definitions';

export const WebSearchHandlers = OperationHandlerSet.lazy(() => import('./fetch'));
