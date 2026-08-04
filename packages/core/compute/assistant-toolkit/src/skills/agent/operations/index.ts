//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { GetContext, Relay } from './definitions';

export * as AgentSkillOperations from './definitions';

export const AgentSkillHandlers = OperationHandlerSet.keyed([
  [GetContext, () => import('./get-context')],
  [Relay, () => import('./relay')],
]);
