//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const AgentWizardHandlers = OperationHandlerSet.lazy(
  () => import('./create-project'),
  () => import('./project-rules'),
  () => import('./sync-triggers'),
);
