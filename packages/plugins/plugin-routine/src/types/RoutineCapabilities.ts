//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import type { DelegationStrategy } from '@dxos/agent-runtime';
import * as Capability from '@dxos/app-framework/Capability';
import * as Routine from '@dxos/compute/Routine';
import type { Database, Obj } from '@dxos/echo';

/**
 * Optional supervisor strategy for the agent chat service. When contributed (by a plugin that knows
 * the agent/plan model, e.g. plugin-assistant), the conversational agent delegates outstanding work
 * to sub-agents and folds their results back into the conversation. Consumed by the AgentService
 * LayerSpec; absent by default (a plain conversational agent).
 *
 * A registry rather than a singleton: the AgentService reads it with `getAll` and takes the first,
 * and a harness that needs the strategy in place before the app's own module activates has to be
 * able to contribute one without the two colliding.
 */
export const AgentDelegationStrategy = Capability.make<DelegationStrategy>()(
  'org.dxos.plugin.routine.capability.agentDelegationStrategy',
);

/**
 * Id of the built-in blank template. Declared here (rather than on the template itself) so callers that
 * scaffold a routine without the picker — e.g. a project's toolbar — can name it without importing the
 * template module.
 */
export const BlankTemplateId = 'org.dxos.routine.blank';

/**
 * A routine template contributed by a plugin. The create dialog lists contributed templates
 * (`Capability.getAll(RoutineCapabilities.Template)`) and runs the chosen template's `scaffold`.
 */
export type Template = {
  /** Stable id (e.g. 'org.dxos.routine.blank'). */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Optional Phosphor icon name. */
  icon?: string;
  /** Omit from the create picker; reachable only by id, for a template that needs a caller's `subject`. */
  hidden?: boolean;
  /** Values the create panel collects as a form before scaffolding; omit and it scaffolds on selection. */
  inputSchema?: Schema.Codec<any, any>;
  /**
   * Build the routine as a fully-wired in-memory {@link Routine.Routine} graph — the routine plus its owned
   * trigger and instructions, assembled by `makeRoutine`. The create flow persists it with a single
   * `Database.add` (which cascades the owned children); scaffold must NOT call `Database.add` itself.
   * `Database.Service` may still be used for read-only lookups (e.g. loading a feed ref). `input` carries
   * the {@link inputSchema} values; `subject` is set only by a caller that seeds this template by id.
   */
  scaffold: (ctx: {
    name?: string;
    subject?: Obj.Unknown;
    input?: any;
  }) => Effect.Effect<Routine.Routine, Error, Database.Service>;
};

export const Template = Capability.make<Template>()('org.dxos.plugin.routine.capability.template');
