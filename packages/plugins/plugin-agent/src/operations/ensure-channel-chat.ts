//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Channel, Message } from '@dxos/types';

import { AgentChannels, AgentOperation } from '#types';

import { sessionSkills } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a conversation's chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

export const loadAgentObjects = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const chat = yield* Agent.loadSession(agent);
  if (!chat) {
    return [Ref.make<Obj.Unknown>(agent)];
  }

  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  return binder
    .getObjects()
    .filter((object) => !Obj.instanceOf(Agent.Session, object))
    .map((object): Ref.Ref<Obj.Unknown> => Ref.make(object));
});

export type EnsureChannelChatProps = {
  agent: Agent.Agent;
  channel: Channel.Channel;
  thread?: string;
  title?: string;
};

/**
 * Returns the agent's chat for a channel conversation, creating it on first contact.
 * Shared with `sendMessage`, which records what it posts in the same chat.
 */
export const ensureChannelChat = Effect.fnUntraced(function* ({
  agent,
  channel,
  thread,
  title,
}: EnsureChannelChatProps) {
  const key = AgentChannels.chatKey(channel.id, thread);
  const match = yield* findChat(agent, key);
  if (match) {
    yield* bindChannelSkills(match, channel);
    return match;
  }

  // Read before the new chat exists: `Agent.loadSession` resolves the agent's latest chat.
  const objects = yield* loadAgentObjects(agent);
  const skills = yield* sessionSkills(agent);

  const feed = yield* Database.add(TrajectoryStore.makeFeed());
  const chat = yield* Database.add(
    Agent.makeSession({
      [Obj.Meta]: { keys: [key] },
      [Obj.Parent]: agent,
      name: title,
      feed: Ref.make(feed),
      instructions: agent.instructions,
    }),
  );

  // Concurrent first contacts can each create a chat: the oldest wins and the others give theirs up.
  const winner = yield* findChat(agent, key);
  if (winner && winner.id !== chat.id) {
    yield* Database.remove(chat);
    yield* Database.remove(feed);
    return winner;
  }

  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  const declared = yield* channelSkills(channel);
  yield* Effect.promise(() =>
    binder.bind({
      skills: [...skills, ...declared],
      objects: [...objects, Ref.make(chat)],
    }),
  );
  return chat;
}, Effect.scoped);

/** The agent's chat for a conversation key, the oldest if concurrent first contacts made more than one. */
const findChat = Effect.fnUntraced(function* (agent: Agent.Agent, key: ReturnType<typeof AgentChannels.chatKey>) {
  // The same conversation may be bridged to more than one agent.
  const chats = yield* Database.query(Query.select(Filter.foreignKeys(Agent.Session, [key]))).run;
  return chats
    .filter((chat) => Obj.getParent(chat)?.id === agent.id)
    .sort((left, right) => left.id.localeCompare(right.id))
    .at(0);
});

/** Appends a message the agent sent to the chat's feed; `properties` carry the backend's receipt. */
export const appendToChat = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  chat: Agent.Session,
  text: string,
  properties?: Record<string, unknown>,
) {
  const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
  yield* TrajectoryStore.appendMessages(feed, [
    Message.make({
      sender: { role: 'assistant', name: agent.name },
      blocks: [{ _tag: 'text', text }],
      properties,
    }),
  ]);
});

/**
 * The skills the channel's backend declares on its config type ({@link Skill.SkillsAnnotation}): how the agent
 * answers there (posting, reacting, mailing) is the backend's to provide, so the agent core names no channel.
 */
const channelSkills = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const config = yield* Database.load(channel.backend.config).pipe(Effect.orElseSucceed(() => undefined));
  return config ? Skill.annotatedSkillRefs(config) : [];
});

/** Binds the channel's skills to a chat made before the channel declared them; a skill already bound is skipped. */
const bindChannelSkills = Effect.fnUntraced(function* (chat: Agent.Session, channel: Channel.Channel) {
  const skills = yield* channelSkills(channel);
  if (skills.length === 0) {
    return;
  }
  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  yield* Effect.promise(() => binder.bind({ skills }));
});

const handler: Operation.WithHandler<typeof AgentOperation.EnsureChannelChat> = AgentOperation.EnsureChannelChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, channel: channelRef, thread, title }) {
      const agent = yield* Database.load(agentRef);
      const channel = yield* Database.load(channelRef);
      const chat = yield* ensureChannelChat({ agent, channel, thread, title });
      return { chat: Ref.make(chat), feed: chat.feed };
    }),
  ),
);

export default handler;
