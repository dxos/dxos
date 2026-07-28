//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.lazy(
  () => import('./get-context'),
  () => import('./relay'),
);
