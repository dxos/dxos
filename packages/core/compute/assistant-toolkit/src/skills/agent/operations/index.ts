//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.lazy(
  () => import('./add-artifact'),
  // Legacy worker/qualifier stay registered so pre-relay triggers persisted in user DBs keep
  // firing until sync-triggers rewrites them; both delete with phase D (plugin-projects PLAN.md).
  () => import('./agent'),
  () => import('./get-context'),
  () => import('./qualifier'),
  () => import('./relay'),
);
