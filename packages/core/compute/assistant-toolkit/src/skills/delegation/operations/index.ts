//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import {
  AgentDelegate,
  DelegateTask,
  DelegateTasks,
  SessionDelegate,
  ThreadDelegate,
  ThreadWait,
} from './definitions.ts';

export * as DelegationSkillOperations from './definitions.ts';

export const DelegationSkillHandlers = OperationHandlerSet.lazy([
  DelegateTask.pipe(Operation.lazyHandler(() => import('./delegate-task.ts'))),
  DelegateTasks.pipe(Operation.lazyHandler(() => import('./delegate-tasks.ts'))),
  ThreadDelegate.pipe(Operation.lazyHandler(() => import('./thread-delegate.ts'))),
  ThreadWait.pipe(Operation.lazyHandler(() => import('./thread-wait.ts'))),
  SessionDelegate.pipe(Operation.lazyHandler(() => import('./session-delegate.ts'))),
  AgentDelegate.pipe(Operation.lazyHandler(() => import('./agent-delegate.ts'))),
]);
