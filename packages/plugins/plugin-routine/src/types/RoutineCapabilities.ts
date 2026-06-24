//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Database, Obj } from '@dxos/echo';
import type { CompletionGuard, DelegationStrategy } from '@dxos/functions-runtime';

import * as Routine from './Routine';

/**
 * Optional supervisor strategy for the agent chat service. When contributed (by a plugin that knows
 * the agent/plan model, e.g. plugin-assistant), the conversational agent delegates outstanding work
 * to sub-agents and folds their results back into the conversation. Consumed by the AgentService
 * LayerSpec; absent by default (a plain conversational agent).
 */
export const AgentDelegationStrategy = Capability.make<DelegationStrategy>(
  'org.dxos.plugin.routine.capability.agentDelegationStrategy',
);

/**
 * Optional plan-completion guard for the agent chat service. When contributed, the agent process
 * runs an ephemeral stop/continue check before succeeding if open plan tasks remain.
 */
export const AgentCompletionGuard = Capability.make<CompletionGuard>(
  'org.dxos.plugin.routine.capability.agentCompletionGuard',
);

/**
 * An automation template contributed by a plugin. The create dialog and the per-object "Automations"
 * companion list contributed templates (`Capability.getAll(RoutineCapabilities.Template)`) and run the
 * chosen template's `scaffold` to build the automation.
 */
export type Template = {
  /** Stable id (e.g. 'org.dxos.routine.blank'). */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Optional Phosphor icon name. */
  icon?: string;
  /**
   * Whether this template applies to the given companion subject. The subject is the object whose
   * "Automations" companion is open, or undefined in the global create dialog. Templates that need a
   * specific subject (e.g. a feed-bearing Mailbox) gate themselves here. Defaults to always-applies.
   */
  appliesTo?: (subject?: Obj.Unknown) => boolean;
  /**
   * Build the Automation from the user's input. The returned Automation is added to the database by the
   * create flow; any auxiliary objects (runnable, triggers) must be added by the scaffold itself via
   * Database.Service. `subject` is set when scaffolding from an object's companion.
   */
  scaffold: (ctx: { name?: string; subject?: Obj.Unknown }) => Effect.Effect<Routine.Routine, Error, Database.Service>;
};

export const Template = Capability.make<Template>('org.dxos.plugin.routine.capability.template');
