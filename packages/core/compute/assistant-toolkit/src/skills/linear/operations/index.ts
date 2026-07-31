//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as LinearOperations from './definitions';

export const LinearHandlers = OperationHandlerSet.lazy(() => import('./sync-issues'));
