//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AgentRules, CreateAgent, SyncAutomation } from './definitions';

export * as AgentWizardOperations from './definitions';

export const AgentWizardHandlers = OperationHandlerSet.keyed([
  [CreateAgent, () => import('./create-agent')],
  [AgentRules, () => import('./agent-rules')],
  [SyncAutomation, () => import('./sync-automation')],
]);
