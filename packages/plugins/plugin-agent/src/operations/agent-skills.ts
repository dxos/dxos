//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import type * as AiContext from '@dxos/assistant/AiContext';
import * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

/** Loaded on demand: the context runtime is heavy and only needed when bindings are read or changed. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

/**
 * The agent's chats — its primary chat and the Discord thread chats bridged to it.
 * A child-of filter rather than `.children()`, which EDGE's query planner cannot run.
 */
export const loadChats = (agent: Agent.Agent): Effect.Effect<Chat.Chat[], never, Database.Service> =>
  Database.query(Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent))).run.pipe(
    Effect.map((chats): Chat.Chat[] => chats.filter((chat) => Obj.instanceOf(Chat.Chat, chat))),
    Effect.orDie,
  );

/** Opens the context binder on a chat's feed for the enclosing scope. */
export const openBinder = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
  const runtime = yield* Effect.context<Database.Service>();
  const { Binder } = yield* Effect.promise(aiContextRuntime);
  return yield* EffectEx.acquireReleaseResource(() => new Binder({ feed, runtime }));
});

/** The agent's own space copies of a skill (parented to the agent). */
export const loadCopies = (agent: Agent.Agent, key: string): Effect.Effect<Skill.Skill[], never, Database.Service> =>
  Database.query(Filter.and(Filter.type(Skill.Skill), Filter.key(key), Filter.childOf(agent))).run.pipe(
    Effect.map((skills): Skill.Skill[] => skills.filter((skill) => Obj.instanceOf(Skill.Skill, skill))),
    Effect.orDie,
  );

/** The skill bound to a chat under the given registry key, if any. */
export const findBound = (binder: AiContext.Binder, key: string): Skill.Skill | undefined =>
  binder.getSkills().find((skill) => Obj.getMeta(skill).key === key);

/**
 * Swaps the chat's binding for `key` to `to`; returns the ref it replaced, or `undefined` when the
 * chat does not bind the skill (a chat that never had it is not given it) or already binds `to`.
 */
export const rebind = Effect.fnUntraced(function* (binder: AiContext.Binder, key: string, to: Ref.Ref<Skill.Skill>) {
  const bound = findBound(binder, key);
  if (!bound) {
    return undefined;
  }

  const from = Skill.makeRef(bound);
  if (from.uri === to.uri) {
    return undefined;
  }

  yield* Effect.promise(() => binder.unbind({ skills: [from] }));
  yield* Effect.promise(() => binder.bind({ skills: [to] }));
  return from;
});

/**
 * An editable copy of `source` owned by the agent: the instruction text is copied into a new space
 * Text so edits never touch the compiled skill; tools and hooks are kept as the original declares them.
 */
export const fork = Effect.fnUntraced(function* (source: Skill.Skill, agent: Agent.Agent) {
  const text = yield* Database.load(source.instructions.source).pipe(Effect.orDie);
  return Obj.make(Skill.Skill, {
    [Obj.Meta]: { key: Skill.getKey(source), version: Skill.getVersion(source) },
    [Obj.Parent]: agent,
    name: source.name,
    description: source.description,
    tools: [...source.tools],
    agentCanEnable: source.agentCanEnable,
    mcpServers: source.mcpServers ? [...source.mcpServers] : undefined,
    hooks: source.hooks ? [...source.hooks] : undefined,
    instructions: Template.make({ source: text.content, inputs: [...(source.instructions.inputs ?? [])] }),
  });
});

/** Replaces the agent's preset skill refs whose URI is in `from` with `to`, so a new chat inherits the swap. */
export const replaceInstructionSkills = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  from: ReadonlySet<string>,
  to: Ref.Ref<Skill.Skill>,
) {
  if (from.size === 0) {
    return;
  }

  const instructions = yield* Database.load(agent.instructions).pipe(Effect.orDie);
  if (!instructions.skills.some((ref) => from.has(ref.uri))) {
    return;
  }

  Obj.update(instructions, (instructions) => {
    instructions.skills = instructions.skills.map((ref) => (from.has(ref.uri) ? to : ref));
  });
});
