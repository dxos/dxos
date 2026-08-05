//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AgentRules, CreateAgent, SyncAutomation } from './definitions';

export * as AgentWizardOperations from './definitions';

export const AgentWizardHandlers = OperationHandlerSet.lazy([
  CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent'))),
  AgentRules.pipe(Operation.lazyHandler(() => import('./agent-rules'))),
  SyncAutomation.pipe(Operation.lazyHandler(() => import('./sync-automation'))),
]);
