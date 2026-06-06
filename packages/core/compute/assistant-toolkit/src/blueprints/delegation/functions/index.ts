//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './delegate-task';

export const DelegationHandlers = OperationHandlerSet.lazy(() => import('./delegate-task'));
