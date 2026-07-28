//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Instructions } from '@dxos/compute';
import { Annotation, Database, DXN, Filter, Ref, Type } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { IdentityDid } from '@dxos/keys';

import { HarnessContextError } from '../errors';

/**
 * An agent identity: a personality (attribution DID) plus its preset payload (instructions with
 * text, skills, objects, and commands). Owns no conversation state — a chat is linked to the agent
 * it runs as by a `CompanionTo` relation (see `./AgentChat`), and durable work products live on a
 * Project (plugin-projects DESIGN.md, "Agent ↔ Project convergence").
 */
export class Agent extends Type.makeObject<Agent>(DXN.make('org.dxos.type.agent', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),

    /**
     * Stable identity DID for the agent, used to attribute content it authors (e.g. suggestion
     * branches) as its own author — distinct from any human or other agent. Seeded at creation
     * (currently synthetic, via {@link IdentityDid.random}); the slot a real HALO identity DID
     * takes once agents get first-class identities. Optional so pre-existing agents still load.
     */
    did: Schema.optional(IdentityDid).annotations({
      title: 'DID',
      description: "The agent's identity DID; attributes content the agent authors.",
    }),

    /**
     * Master switch for the agent's automation (propagated onto its compiled routine triggers).
     */
    enabled: Schema.optional(Schema.Boolean).annotations({
      title: 'Enabled',
      description: 'Master switch for agent automation; propagated to all triggers on sync.',
    }),

    /**
     * Instructions for the agent — the preset payload (text, skills, objects, commands) a chat
     * receives when the agent is applied to it.
     */
    instructions: Ref.Ref(Instructions.Instructions).pipe(Schema.annotations({ title: 'Instructions' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--drone--regular', hue: 'sky' }),
  ),
) {}

/**
 * Resolves the agent's instructions and their markdown text.
 */
export const loadInstructions = (
  agent: Agent,
): Effect.Effect<{ text: string; instructions: Instructions.Instructions }, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const instructions = yield* Database.load(agent.instructions);
    const text = yield* Database.load(instructions.text).pipe(
      Effect.map((doc) => doc.content),
      Effect.catchTag('EntityNotFoundError', () => Effect.succeed('')),
    );
    return { text, instructions };
  });

export const getFromChatContext: Effect.Effect<
  Agent,
  HarnessContextError | Harness.NotSupportedError,
  Harness.HarnessService
> = Effect.gen(function* () {
  const agents = yield* Harness.queryContext(Filter.type(Agent));
  if (agents.length !== 1) {
    return yield* Effect.fail(new HarnessContextError({ type: 'agent', count: agents.length }));
  }

  const agent = agents[0];
  return agent;
});
