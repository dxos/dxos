//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * from './definitions';

export const AgentHandlers = OperationHandlerSet.lazy(() => import('./run-instructions'));
