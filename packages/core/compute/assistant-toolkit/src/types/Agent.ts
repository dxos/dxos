//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContext, Harness } from '@dxos/assistant';
import { Instructions, type Skill } from '@dxos/compute';
import { Annotation, Database, DXN, Feed, Filter, Format, Obj, Ref, Relation, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { EID, type EntityId, IdentityDid } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { HarnessContextError } from '../errors';
import * as Chat from './Chat';

/**
 * Agent schema definition.
 */
export class Agent extends Type.makeObject<Agent>(DXN.make('org.dxos.type.agent', '0.1.0'))(
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
     * When false, agent triggers are disabled after sync-triggers runs.
     */
    enabled: Schema.optional(Schema.Boolean).annotations({
      title: 'Enabled',
      description: 'Master switch for agent automation; propagated to all triggers on sync.',
    }),

    /**
     * Instructions for the agent — the preset payload (text, skills, objects, commands) a chat
     * receives when the agent is applied to it. Pre-phase-A records point at a bare `Text`; read
     * through {@link loadInstructions}, which accepts both shapes until the phase-D migration.
     */
    instructions: Ref.Ref(Instructions.Instructions).pipe(Schema.annotations({ title: 'Instructions' })),

    /**
     * Primary chat for the agent.
     */
    // Suspended: Agent ↔ Chat reference each other across modules, so the schema must not touch
    // `Chat.Chat` while this module evaluates during Chat's import.
    chat: Schema.optional(
      Schema.suspend((): Ref.RefSchema<Chat.Chat> => Ref.Ref(Chat.Chat)).pipe(FormInputAnnotation.set(false)),
    ),

    // TODO(burdon): Currently Memory.Memory objects are global to the space; make them artifacts?
    artifacts: Schema.Array(
      Schema.Struct({
        // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
        name: Schema.String,
        // TODO(burdon): Rename object.
        data: Ref.Ref(Obj.Unknown),
      }),
    ).pipe(FormInputAnnotation.set(false)),

    /**
     * References to objects with a canonical queue property.
     * Schema must have the QueueAnnotation.
     */
    // Change to trigger.
    // TODO(dmaretskyi): Turn into an array of objects when form-data
    subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false)),

    /**
     * Cron expression for a timer trigger that invokes the agent worker on a schedule.
     * The timer trigger bypasses the qualifier and goes straight to the agent worker.
     */
    // Change to trigger.
    cron: Schema.optional(Schema.String).annotations({
      title: 'Cron',
      description: 'Cron expression for a timer trigger that invokes the agent on a schedule.',
    }),

    /**
     * Input feed for subscriptions.
     * @deprecated Subscriptions will write directly to the agent.
     */
    feed: Schema.optional(Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false))),

    /**
     * Allow the agent to filter events.
     * Related events will be added to the input queue of the agent.
     * It is recommended to enable this.
     * @deprecated
     */
    filterEvents: Schema.optional(Schema.Boolean).annotations({
      title: 'Filter events',
      description: 'Allow the agent to filter events.',
    }),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--drone--regular', hue: 'sky' }),
  ),
) {}

/**
 * Resolves the agent's instructions, dual-reading both persisted shapes: the typed `Instructions`
 * (phase A onward) and the bare `Text` that pre-migration records point at (rewritten by the
 * phase-D migration — see plugin-projects PLAN.md). `instructions` is absent for the legacy shape.
 */
export const loadInstructions = (
  agent: Agent,
): Effect.Effect<{ text: string; instructions?: Instructions.Instructions }, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    // Resolve untyped: the schema says `Instructions`, but legacy records resolve to a `Text`, so
    // the target type must be discovered rather than assumed (an untyped ref carries no resolver,
    // so `Database.resolve` — which goes through the DB — is required here, not `Database.load`).
    const target = yield* Database.resolve(agent.instructions.uri);
    if (Obj.instanceOf(Instructions.Instructions, target)) {
      const text = yield* Database.load(target.text).pipe(
        Effect.map((doc) => doc.content),
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed('')),
      );
      return { text, instructions: target };
    }
    if (Obj.instanceOf(Text.Text, target)) {
      return { text: target.content };
    }
    return { text: '' };
  });

export type MakeProps = Omit<Obj.MakeProps<typeof Agent>, 'instructions' | 'artifacts' | 'subscriptions' | 'chat'> &
  Partial<Pick<Obj.MakeProps<typeof Agent>, 'artifacts' | 'subscriptions'>> & {
    instructions: string;
    skills?: Ref.Ref<Skill.Skill>[];
    contextObjects?: Ref.Ref<Obj.Any>[];
  };

/**
 * Creates a fully initialized Agent with chat, queue, and context bindings.
 *
 * @param props - Agent properties including spec, skills, and context objects.
 * @param skill - The skill to use for the agent context.
 * @returns An Effect that yields the initialized Agent.
 */
export const makeInitialized = (
  props: MakeProps,
  // TODO(burdon): Reconcile with props.skills.
  skill: Skill.Skill,
): Effect.Effect<Agent, never, Database.Service> =>
  Effect.gen(function* () {
    const { skills: propsSkills, contextObjects, ...agentProps } = props;

    // Persist any inline (transient) skills so their refs are resolvable from feed bindings later.
    // Refs created with Ref.make(obj) carry an inline target, but when stored in ECHO and read back
    // by a new AiSession, the target is lost and must be found in the DB via tryLoad().
    const persistedPropsSkills = yield* Effect.all(
      (propsSkills ?? []).map((ref) =>
        ref.target !== undefined
          ? Database.add(ref.target).pipe(Effect.map((persisted) => Ref.make(persisted)))
          : Effect.succeed(ref),
      ),
    );

    // The typed Instructions is the agent's preset payload: text plus skill set (PLAN.md phase A).
    const instructions = yield* Database.add(
      Instructions.make({ text: props.instructions, skills: persistedPropsSkills }),
    );
    const agent = yield* Database.add(
      Obj.make(Agent, {
        // `did` (if provided) flows through via agentProps. Not auto-minted here: `IdentityDid.random()`
        // uses uncontrolled `randomBytes`, which would make agent creation non-deterministic and break
        // memoized-LLM tests. Minting is deferred to the runtime-identity provision (see agent-identity
        // spec), where it can be deterministic or a real HALO DID.
        ...agentProps,
        instructions: Ref.make(instructions),
        artifacts: props.artifacts ?? [],
        subscriptions: props.subscriptions ?? [],
        filterEvents: props.filterEvents ?? true,
        enabled: props.enabled ?? true,
      }),
    );
    Obj.setParent(instructions, agent);
    const feed = yield* Database.add(Feed.make());
    const runtime = yield* Effect.runtime<Database.Service>();
    const contextBinder = new AiContext.Binder({ feed, runtime });
    // TODO(dmaretskyi): Skill registry.
    const agentSkill = yield* Database.add(Obj.clone(skill, { deep: 'all' }));

    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
        // Steer the agent's chat through the milestone-3 channel (rendered into the system prompt).
        instructions: Ref.make(instructions),
        // Phase-B inversion: the chat references its agent; `agent.chat` below is the dual-write
        // kept for legacy readers until the phase-D migration.
        agent: Ref.make(agent),
      }),
    );
    Obj.setParent(feed, chat);
    yield* Effect.promise(() =>
      contextBinder.bind({
        skills: [Ref.make(agentSkill), ...persistedPropsSkills],
        objects: [Ref.make(agent), Ref.make(chat), ...(contextObjects ?? [])],
      }),
    );
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: agent,
      }),
    );

    const inputFeed = yield* Database.add(Feed.make());
    Obj.update(agent, (agent) => {
      agent.chat = Ref.make(chat);
      agent.feed = Ref.make(inputFeed);
    });

    return agent;
  });

/**
 * Resets the agent chat history by rebuilding the chat context.
 * Preserves the existing skills and objects from the current chat context.
 *
 * @param agent - The agent whose chat history should be reset. Must have an existing chat.
 * @returns An Effect that resets the chat history.
 */
export const resetChatHistory = (agent: Agent): Effect.Effect<void, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    invariant(agent.chat, 'Agent must have an existing chat to reset.');

    const existingFeed = yield* agent.chat.pipe(Database.load).pipe(
      Effect.map((_) => _.feed),
      Effect.flatMap(Database.load),
    );
    const runtime = yield* Effect.runtime<Database.Service>();
    const existingContextBinder = yield* EffectEx.acquireReleaseResource(
      () =>
        new AiContext.Binder({
          feed: existingFeed,
          runtime,
        }),
    );
    const skills = existingContextBinder.getSkills().map((skill) => Ref.make(skill));
    const objects = existingContextBinder
      .getObjects()
      .filter((object) => !Obj.instanceOf(Chat.Chat, object))
      .map((object) => Ref.make(object));

    const feed = yield* Database.add(Feed.make());
    const contextBinder = new AiContext.Binder({ feed, runtime });

    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
        // The rebuilt chat keeps the agent's steering and identity (phase-B shape).
        instructions: agent.instructions,
        agent: Ref.make(agent),
      }),
    );
    Obj.setParent(feed, chat);
    yield* Effect.promise(() =>
      contextBinder.bind({
        skills,
        objects: [...objects, Ref.make(chat)],
      }),
    );
    // Dual-write kept for legacy readers until the phase-D migration.
    Obj.update(agent, (agent) => {
      agent.chat = Ref.make(chat);
    });

    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: agent,
      }),
    );
  }).pipe(Effect.scoped);

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

/**
 * Adds an object to the agent's artifacts (context), resolving it by id within the agent's space.
 *
 * Accepts whatever reference a tool returned — a bare entity id (e.g. `01J…`) or a full ECHO URI
 * (`echo:/…`, `echo://…`). LLMs frequently strip a returned URI down to the bare id, which is not
 * a resolvable URI on its own; resolving by entity id within the space tolerates both forms.
 *
 * Returns the fully-qualified {@link Ref.Ref} that was stored (also usable for an inline message
 * reference block).
 */
export const addArtifact = (
  agent: Agent,
  { name, id }: { name: string; id: string },
): Effect.Effect<Ref.Ref<Obj.Unknown>, Error, Database.Service> =>
  Effect.gen(function* () {
    // Untyped, LLM-provided reference: normalize to the entity id, falling back to the raw value
    // (a bare id is already an entity id) — a genuine external-data boundary.
    const parsed = EID.tryParse(id);
    const entityId = ((parsed ? EID.getEntityId(parsed) : undefined) ?? id) as EntityId;

    // Store a FULLY-QUALIFIED ref (`echo://<space>/<id>`), not a local `echo:/<id>` one: the artifact
    // is created by a separate tool/process invocation, and a space-less local ref does not resolve
    // when the agent is later read from a different db view (e.g. the UI). It is not resolved here —
    // it resolves lazily when read, by which point the artifact is persisted.
    const { db } = yield* Database.Service;
    const ref = db.makeRef<Obj.Unknown>(EID.make({ spaceId: db.spaceId, entityId }));

    Obj.update(agent, (agent) => {
      agent.artifacts.push({ name, data: ref });
    });
    yield* Database.flush();
    return ref;
  });
