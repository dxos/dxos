//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DelegateTask, DelegateTasks } from './definitions';

export * as DelegationSkillOperations from './definitions';

export const DelegationSkillHandlers = OperationHandlerSet.lazy([
  DelegateTask.pipe(Operation.lazyHandler(() => import('./delegate-task'))),
  DelegateTasks.pipe(Operation.lazyHandler(() => import('./delegate-tasks'))),
]);
