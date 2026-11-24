//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/compute/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Database, type Error as EchoError, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as TrajectoryStore from '../session/TrajectoryStore.ts';

/**
 * Creating and resetting agents: the helpers that need the context binder, so they stay above `@dxos/compute`.
 *
 * The AI session runtime (MCP SDK, Anthropic client, ~280 KB) is loaded lazily, so it loads only when an agent
 * operation actually runs.
 */
const aiContextRuntime = () => import('../session/AiContext.ts');

export type MakeProps = Omit<Obj.MakeProps<typeof Agent.Agent>, 'instructions'> & {
  instructions: string;
  skills?: Ref.Ref<Skill.Skill>[];
  contextObjects?: Ref.Ref<Obj.Any>[];
};

/**
 * Creates a fully initialized Agent with its first chat and context bindings.
 *
 * @param props - Agent properties including spec, skills, and context objects.
 * @param skill - The skill to use for the agent context: a skill object is cloned into the space, a ref
 *   (e.g. a registry URI) is bound as-is so the agent follows the compiled skill until customized.
 * @returns An Effect that yields the initialized Agent.
 */
export const makeInitialized = (
  props: MakeProps,
  // TODO(burdon): Reconcile with props.skills.
  skill: Skill.Skill | Ref.Ref<Skill.Skill>,
): Effect.Effect<Agent.Agent, never, Database.Service> =>
  Effect.gen(function* () {
    const { skills: propsSkills, contextObjects, ...agentProps } = props;

    // Loaded before anything is persisted: a rejected chunk after the first `Database.add` would
    // leave a half-built agent graph behind with nothing to clean it up.
    const AiContextRuntime = yield* Effect.promise(aiContextRuntime);

    // Persist any inline (transient) skills so their refs are resolvable from feed bindings later.
    // Refs created with Ref.make(obj) carry an inline target, but when stored in ECHO and read back
    // by a new AiSession, the target is lost and must be found in the DB via tryLoad().
    // `peek` rather than `target`: a registry-URI ref has no inline target and no resolver yet.
    const persistedPropsSkills = yield* Effect.all(
      (propsSkills ?? []).map((ref) => {
        const target = ref.peek();
        return target !== undefined
          ? Database.add(target).pipe(Effect.map((persisted) => Ref.make(persisted)))
          : Effect.succeed(ref);
      }),
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
    const feed = yield* Database.add(TrajectoryStore.makeFeed());
    const runtime = yield* Effect.context<Database.Service>();
    const contextBinder = yield* EffectEx.acquireReleaseResource(() => new AiContextRuntime.Binder({ feed, runtime }));
    const agentSkill = Ref.isRef(skill) ? skill : Ref.make(yield* Database.add(Obj.clone(skill, { deep: 'all' })));

    const chat = yield* Database.add(
      Agent.makeSession({
        feed: Ref.make(feed),
        // Steered through the chat's own channel: instructions render into the system prompt.
        // Identity/attribution comes from the companion link (ref on the agent + parent edge).
        instructions: Ref.make(instructions),
      }),
    );
    Agent.linkCompanion({ chat, subject: agent });
    yield* Effect.promise(() =>
      contextBinder.bind({
        skills: [agentSkill, ...persistedPropsSkills],
        objects: [Ref.make(agent), Ref.make(chat), ...(contextObjects ?? [])],
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
export const resetChatHistory = (
  agent: Agent.Agent,
): Effect.Effect<void, EchoError.EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const existingChat = yield* Agent.loadSession(agent);
    if (!existingChat) {
      return yield* Effect.die(new Error('Agent must have an existing chat to reset.'));
    }

    const existingFeed = yield* Database.load(existingChat.feed);
    const runtime = yield* Effect.context<Database.Service>();
    const AiContextRuntime = yield* Effect.promise(aiContextRuntime);
    const existingContextBinder = yield* EffectEx.acquireReleaseResource(
      () =>
        new AiContextRuntime.Binder({
          feed: existingFeed,
          runtime,
        }),
    );
    const skills = existingContextBinder.getSkills().map(Skill.makeRef);
    const objects = existingContextBinder
      .getObjects()
      .filter((object) => !Obj.instanceOf(Agent.Session, object))
      .map((object) => Ref.make(object));

    const feed = yield* Database.add(TrajectoryStore.makeFeed());
    const contextBinder = yield* EffectEx.acquireReleaseResource(() => new AiContextRuntime.Binder({ feed, runtime }));

    const chat = yield* Database.add(
      Agent.makeSession({
        feed: Ref.make(feed),
        instructions: agent.instructions,
      }),
    );
    Agent.linkCompanion({ chat, subject: agent });
    yield* Effect.promise(() =>
      contextBinder.bind({
        skills,
        objects: [...objects, Ref.make(chat)],
      }),
    );

    // The old chat stays parented (history is retired, not deleted); the new chat is primary
    // because `Agent.loadSession` resolves the latest child by creation order.
  }).pipe(Effect.scoped);
