//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The agent <-> chat lifecycle. Sits above both types: `Agent` and `Chat` know nothing of each
// other (the linkage is the `CompanionTo` relation, not a schema field), so this is the only
// module that needs both.

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Instructions, type Skill } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { EffectEx } from '@dxos/effect';

import * as Agent from './Agent';
import * as Chat from './Chat';

/**
 * Resolves the agent a chat runs as, if any. Plain (agentless) chats yield `undefined`.
 * Companion targets are untyped, so the agent is the one target of that type.
 */
export const loadAgent = (chat: Chat.Chat): Effect.Effect<Agent.Agent | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const targets = yield* Database.query(Query.select(Filter.id(chat.id)).sourceOf(Chat.CompanionTo).target()).run;
    return targets.find(Obj.instanceOf(Agent.Agent));
  }).pipe(Effect.orDie);

/**
 * Resolves the agent's primary chat (the agent holds no chat ref).
 */
export const loadChat = (agent: Agent.Agent): Effect.Effect<Chat.Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chats = yield* Database.query(Query.select(Filter.id(agent.id)).targetOf(Chat.CompanionTo).source()).run;
    const [chat] = chats.filter(Obj.instanceOf(Chat.Chat));
    return chat;
  }).pipe(Effect.orDie);

export type MakeProps = Omit<Obj.MakeProps<typeof Agent.Agent>, 'instructions'> & {
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
): Effect.Effect<Agent.Agent, never, Database.Service> =>
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
      Obj.make(Agent.Agent, {
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
export const resetChatHistory = (agent: Agent.Agent): Effect.Effect<void, EntityNotFoundError, Database.Service> =>
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
