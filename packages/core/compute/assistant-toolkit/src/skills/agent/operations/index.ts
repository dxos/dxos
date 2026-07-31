//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.lazy(
  () => import('./get-context'),
  () => import('./relay'),
);
