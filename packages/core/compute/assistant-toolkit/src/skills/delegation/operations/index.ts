//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DelegateTask, DelegateTasks } from './definitions.ts';

export * as DelegationSkillOperations from './definitions.ts';

export const DelegationSkillHandlers = OperationHandlerSet.lazy([
  DelegateTask.pipe(Operation.lazyHandler(() => import('./delegate-task.ts'))),
  DelegateTasks.pipe(Operation.lazyHandler(() => import('./delegate-tasks.ts'))),
]);
