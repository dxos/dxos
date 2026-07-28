//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContext, Harness } from '@dxos/assistant';
import { Instructions, type Skill } from '@dxos/compute';
import { Annotation, Database, DXN, Feed, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { EffectEx } from '@dxos/effect';
import { IdentityDid } from '@dxos/keys';

import { HarnessContextError } from '../errors';
import * as Chat from './Chat';

/**
 * An agent identity: a personality (attribution DID) plus its preset payload (instructions with
 * text, skills, objects, and commands). Owns no conversation state — a chat is linked to the agent
 * it runs as by a `CompanionTo` relation, and durable work products live on a Project
 * (plugin-projects DESIGN.md, "Agent ↔ Project convergence").
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
 * Resolves the agent's primary chat (the agent holds no chat ref).
 */
export const loadChat = (agent: Agent): Effect.Effect<Chat.Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chats = yield* Database.query(Query.select(Filter.id(agent.id)).targetOf(Chat.CompanionTo).source()).run;
    const [chat] = chats.filter(Obj.instanceOf(Chat.Chat));
    return chat;
  }).pipe(Effect.orDie);

/**
 * Resolves the agent a chat runs as, if any. Plain (agentless) chats yield `undefined`.
 * Companion targets are untyped, so the agent is the one target of that type.
 */
export const loadForChat = (chat: Chat.Chat): Effect.Effect<Agent | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const targets = yield* Database.query(Query.select(Filter.id(chat.id)).sourceOf(Chat.CompanionTo).target()).run;
    return targets.find(Obj.instanceOf(Agent));
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
    const contextBinder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
    // TODO(dmaretskyi): Skill registry.
    const agentSkill = yield* Database.add(Obj.clone(skill, { deep: 'all' }));

    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
        // Steered through the chat's own channel: instructions render into the system prompt.
        // Identity/attribution comes from the CompanionTo relation below.
        instructions: Ref.make(instructions),
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

    return agent;
  }).pipe(Effect.scoped);

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
      .filter((object) => !Obj.instanceOf(Chat.Chat, object))
      .map((object) => Ref.make(object));

    const feed = yield* Database.add(Feed.make());
    const contextBinder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));

    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
        instructions: agent.instructions,
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
    const relations = yield* Database.query(Query.select(Filter.id(agent.id)).targetOf(Chat.CompanionTo)).run.pipe(
      Effect.orDie,
    );
    for (const relation of relations) {
      // Compare by id: the two query paths may resolve distinct proxy instances for the same chat.
      if (Relation.getSource(relation).id === existingChat.id) {
        yield* Database.remove(relation);
      }
    }
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
