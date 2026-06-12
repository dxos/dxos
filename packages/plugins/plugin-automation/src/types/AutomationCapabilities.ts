//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type DelegationStrategy } from '@dxos/functions-runtime';
import type { Database, Obj } from '@dxos/echo';

import * as Automation from './Automation';

/**
 * Optional supervisor strategy for the agent chat service. When contributed (by a plugin that knows
 * the agent/plan model, e.g. plugin-assistant), the conversational agent delegates outstanding work
 * to sub-agents and folds their results back into the conversation. Consumed by the AgentService
 * LayerSpec; absent by default (a plain conversational agent).
 */
export const AgentDelegationStrategy = Capability.make<DelegationStrategy>(
  'org.dxos.plugin.automation.capability.agentDelegationStrategy',
);

/**
 * An automation template contributed by a plugin. The create dialog and the per-object "Automations"
 * companion list contributed templates (`Capability.getAll(AutomationCapabilities.Template)`) and run the
 * chosen template's `scaffold` to build the automation.
 */
export type Template = {
  /** Stable id (e.g. 'org.dxos.automation.blank'). */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Optional Phosphor icon name. */
  icon?: string;
  /**
   * Build the Automation from the user's input. The returned Automation is added to the database by the
   * create flow; any auxiliary objects (runnable, triggers) must be added by the scaffold itself via
   * Database.Service. `subject` is set when scaffolding from an object's companion.
   */
  scaffold: (ctx: {
    name?: string;
    subject?: Obj.Unknown;
  }) => Effect.Effect<Automation.Automation, Error, Database.Service>;
};

export const Template = Capability.make<Template>('org.dxos.plugin.automation.capability.template');
