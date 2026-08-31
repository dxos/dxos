//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetContext, Relay, SyncAutomation } from './definitions';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.lazy([
  GetContext.pipe(Operation.lazyHandler(() => import('./get-context'))),
  Relay.pipe(Operation.lazyHandler(() => import('./relay'))),
  SyncAutomation.pipe(Operation.lazyHandler(() => import('./sync-automation'))),
]);
