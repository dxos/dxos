//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as AgentWizardOperations from './definitions';

export const AgentWizardHandlers = OperationHandlerSet.lazy(
  () => import('./create-agent'),
  () => import('./agent-rules'),
  () => import('./sync-triggers'),
);
