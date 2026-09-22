//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetContext, Relay, SyncAutomation } from './definitions.ts';

export * as AgentSkillOperations from './definitions.ts';

export const AgentSkillHandlers = OperationHandlerSet.lazy([
  GetContext.pipe(Operation.lazyHandler(() => import('./get-context.ts'))),
  Relay.pipe(Operation.lazyHandler(() => import('./relay.ts'))),
  SyncAutomation.pipe(Operation.lazyHandler(() => import('./sync-automation.ts'))),
]);
