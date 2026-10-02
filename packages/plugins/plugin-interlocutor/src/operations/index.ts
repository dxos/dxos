//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InterlocutorOperation, MemoryOperation } from '#types';

export const InterlocutorOperationHandlerSet = OperationHandlerSet.lazy([
  InterlocutorOperation.CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent.ts'))),
  InterlocutorOperation.EnsureThreadChat.pipe(Operation.lazyHandler(() => import('./ensure-thread-chat.ts'))),
  InterlocutorOperation.ListAgents.pipe(Operation.lazyHandler(() => import('./list-agents.ts'))),
  MemoryOperation.ResolveEntity.pipe(Operation.lazyHandler(() => import('./resolve-entity.ts'))),
  MemoryOperation.Remember.pipe(Operation.lazyHandler(() => import('./remember.ts'))),
  MemoryOperation.Recall.pipe(Operation.lazyHandler(() => import('./recall.ts'))),
  MemoryOperation.ProposeGoal.pipe(Operation.lazyHandler(() => import('./propose-goal.ts'))),
  MemoryOperation.ConfirmGoal.pipe(Operation.lazyHandler(() => import('./confirm-goal.ts'))),
  MemoryOperation.UpdateProfile.pipe(Operation.lazyHandler(() => import('./update-profile.ts'))),
]);
