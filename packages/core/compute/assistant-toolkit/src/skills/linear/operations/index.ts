//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as LinearOperations from './definitions';

export const LinearHandlers = OperationHandlerSet.lazy(() => import('./sync-issues'));
