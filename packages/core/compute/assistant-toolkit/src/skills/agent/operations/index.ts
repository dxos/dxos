//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.lazy(
  () => import('./add-artifact'),
  () => import('./agent'),
  () => import('./get-context'),
  () => import('./qualifier'),
);
