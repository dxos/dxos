//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as DelegationOperations from './delegate-task';

export const DelegationHandlers = OperationHandlerSet.lazy(() => import('./delegate-task'));
