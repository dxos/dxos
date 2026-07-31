//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as DelegationOperations from './delegate-task';

export const DelegationHandlers = OperationHandlerSet.lazy(() => import('./delegate-task'));
