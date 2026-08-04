//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DelegateTask } from './definitions';

export * as DelegationOperations from './definitions';

export const DelegationHandlers = OperationHandlerSet.keyed([[DelegateTask, () => import('./delegate-task')]]);
