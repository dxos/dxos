//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContext, Harness } from '@dxos/assistant';
import { Instructions, type Skill } from '@dxos/compute';
import { Annotation, Database, DXN, Feed, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { EffectEx } from '@dxos/effect';
import { IdentityDid } from '@dxos/keys';

import { HarnessContextError } from '../errors';
import * as Plan from './Plan';

/**
 * AI chat.
 */
// TODO(burdon): This is badly named.
export class Chat extends Type.makeObject<Chat>(DXN.make('org.dxos.type.assistant.chat', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
    viewType: Schema.String.pipe(Schema.optional),

    /**
     * Instructions steering this conversation, rendered into the system prompt at request time.
     * Held by reference (never copied), so a project's chats follow edits to its instructions.
     */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false))),

    /**
     * The agent identity this conversation runs as (attribution + preset), if any. The inverse of
     * the legacy `Agent.chat` ref: chats reference their agent, agents own no conversation state.
     * "The agent's chats" is a query on this field (or the `CompanionTo` relation). Suspended
     * because `Agent` is declared later in this module (forward reference).
     */
    agent: Schema.optional(
      Schema.suspend((): Ref.RefSchema<Agent> => Ref.Ref(Agent)).pipe(FormInputAnnotation.set(false)),
    ),

    /**
     * Session plan for tracking task progress within this conversation.
     * Created lazily when the first task is recorded.
     */
    // TODO(burdon): Generalize to artifact associated with a skill?
    plan: Schema.optional(Ref.Ref(Plan.Plan).pipe(FormInputAnnotation.set(false))),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--sparkle--regular',
      hue: 'amber',
    }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

/**
 * Returns the session plan, creating and attaching one when absent.
 */
export const ensurePlan = (chat: Chat): Effect.Effect<Plan.Plan, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    if (chat.plan) {
      return yield* Database.load(chat.plan);
    }

    const plan = yield* Database.add(Plan.makePlan({ tasks: [] }));
    Obj.update(chat, (chat) => {
      chat.plan = Ref.make(plan);
    });
    yield* Database.flush();
    return plan;
  });

/**
 * Resolves the bound session {@link Chat} for the current conversation.
 * Planning and other session-scoped tools require exactly one chat in harness context.
 */
export const getFromContext: Effect.Effect<
  Chat,
  HarnessContextError | Harness.NotSupportedError,
  Harness.HarnessService
> = Effect.gen(function* () {
  const chats = yield* Harness.queryContext(Filter.type(Chat));
  if (chats.length !== 1) {
    return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
  }

  return chats[0];
});

/** @deprecated Use CompanionTo instead. */
export class LegacyCompanionTo extends Type.makeRelation<LegacyCompanionTo>(
  DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
)({
  source: Chat,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
  }),
) {}

/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export class CompanionTo extends Type.makeRelation<CompanionTo>(
  DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
)({
  source: Chat,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
  }),
) {}

//
// Agent — co-located with Chat: the two types reference each other (Chat.agent, the agent's
// companion chat helpers), and separate modules would form an import cycle. `./Agent` re-exports
// this section so the `Agent.*` namespace is unchanged for consumers.
//

/**
 * An agent identity: a personality (attribution DID) plus its preset payload (instructions with
 * text, skills, objects, and commands). Owns no conversation state — chats reference their agent
 * via `Chat.agent`, and durable work products live on a Project (plugin-projects DESIGN.md,
 * "Agent ↔ Project convergence").
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

/**
 * Resolves the agent's primary chat via the `CompanionTo` relation (the agent owns no chat ref).
 */
export const loadChat = (agent: Agent): Effect.Effect<Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chats = yield* Database.query(Query.select(Filter.id(agent.id)).targetOf(CompanionTo).source()).run;
    const [chat] = chats.filter(Obj.instanceOf(Chat));
    return chat;
  }).pipe(Effect.orDie);

export type MakeProps = Omit<Obj.MakeProps<typeof Agent>, 'instructions'> & {
  instructions: string;
  skills?: Ref.Ref<Skill.Skill>[];
  contextObjects?: Ref.Ref<Obj.Any>[];
};

/**
 * Creates a fully initialized Agent with its first chat and context bindings.
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

    // The typed Instructions is the agent's preset payload: text plus skill set.
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
      make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
        // Steered through the chat's own channels: instructions render into the system prompt,
        // the agent ref carries identity/attribution.
        instructions: Ref.make(instructions),
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
      Relation.make(CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: agent,
      }),
    );

    return agent;
  });

/**
 * Resets the agent's chat history by rebuilding the chat context.
 * Preserves the existing skills and objects from the current chat context.
 *
 * @param agent - The agent whose chat history should be reset. Must have an existing chat.
 * @returns An Effect that resets the chat history.
 */
export const resetChatHistory = (agent: Agent): Effect.Effect<void, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const existingChat = yield* loadChat(agent);
    if (!existingChat) {
      return yield* Effect.dieMessage('Agent must have an existing chat to reset.');
    }

    const existingFeed = yield* Database.load(existingChat.feed);
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
      .filter((object) => !Obj.instanceOf(Chat, object))
      .map((object) => Ref.make(object));

    const feed = yield* Database.add(Feed.make());
    const contextBinder = new AiContext.Binder({ feed, runtime });

    const chat = yield* Database.add(
      make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
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

    // Retire the old companion link; the new chat becomes the primary.
    const relations = yield* Database.query(Query.select(Filter.id(agent.id)).targetOf(CompanionTo)).run.pipe(
      Effect.orDie,
    );
    for (const relation of relations) {
      if (Relation.getSource(relation) === existingChat) {
        yield* Database.remove(relation);
      }
    }
    yield* Database.add(
      Relation.make(CompanionTo, {
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
