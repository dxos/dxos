//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type DelegationStrategy } from '@dxos/functions-runtime';

/**
 * Optional supervisor strategy for the agent chat service. When contributed (by a plugin that knows
 * the agent/plan model, e.g. plugin-assistant), the conversational agent delegates outstanding work
 * to sub-agents and folds their results back into the conversation. Consumed by the AgentService
 * LayerSpec; absent by default (a plain conversational agent).
 */
export const AgentDelegationStrategy = Capability.make<DelegationStrategy>(
  'org.dxos.plugin.automation.capability.agentDelegationStrategy',
);
