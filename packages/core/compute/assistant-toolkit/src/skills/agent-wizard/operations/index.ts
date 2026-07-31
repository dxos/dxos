//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as AgentWizardOperations from './definitions';

export const AgentWizardHandlers = OperationHandlerSet.lazy(
  () => import('./create-agent'),
  () => import('./agent-rules'),
  () => import('./sync-automation'),
);
