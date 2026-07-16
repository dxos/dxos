//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import type { DelegationStrategy } from '@dxos/agent-runtime';
import { Capability } from '@dxos/app-framework';
import type { Database, Obj } from '@dxos/echo';

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
   * Build the routine as a fully-wired in-memory {@link Routine.Routine} graph — the routine plus its owned
   * trigger and instructions, assembled by `Routine.make`. The create flow persists it with a single
   * `Database.add` (which cascades the owned children); scaffold must NOT call `Database.add` itself.
   * `Database.Service` may still be used for read-only lookups (e.g. loading a feed ref). `subject` is set
   * when scaffolding from an object's companion.
   */
  scaffold: (ctx: { name?: string; subject?: Obj.Unknown }) => Effect.Effect<Routine.Routine, Error, Database.Service>;
};

export const Template = Capability.make<Template>('org.dxos.plugin.routine.capability.template');
