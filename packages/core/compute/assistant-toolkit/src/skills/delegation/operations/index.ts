//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DelegateTask } from './definitions';

export * as DelegationOperations from './definitions';

export const DelegationHandlers = OperationHandlerSet.lazy([
  DelegateTask.pipe(Operation.lazyHandler(() => import('./delegate-task'))),
]);
