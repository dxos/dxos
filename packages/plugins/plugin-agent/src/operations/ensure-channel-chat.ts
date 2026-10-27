//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Channel } from '@dxos/types';

import { AgentChannels, AgentOperation } from '#types';

import { sessionSkills } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a conversation's chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

export const loadAgentObjects = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const chat = yield* Agent.loadChat(agent);
  if (!chat) {
    return [Ref.make<Obj.Unknown>(agent)];
  }

  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  return binder
    .getObjects()
    .filter((object) => !Obj.instanceOf(Chat.Chat, object))
    .map((object): Ref.Ref<Obj.Unknown> => Ref.make(object));
});

export type EnsureChannelChatProps = {
  agent: Agent.Agent;
  channel: Channel.Channel;
  thread?: string;
  title?: string;
  /** A direct conversation the channel's host has yet to open; the chat also carries {@link AgentChannels.directKey}. */
  direct?: boolean;
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
  direct,
}: EnsureChannelChatProps) {
  const key = AgentChannels.chatKey(channel.id, thread);
  // The same conversation may be bridged to more than one agent.
  const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
  const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
  if (match) {
    // A chat first made without `direct` (e.g. by `EnsureChannelChat`) still needs the key the host finds pending DMs by.
    if (direct && !Obj.getMeta(match).keys.some(({ source }) => source === AgentChannels.DIRECT_SOURCE)) {
      Obj.update(match, (match) => {
        Obj.getMeta(match).keys.push(AgentChannels.directKey(channel.id));
      });
    }
    yield* bindChannelSkills(match, channel);
    return match;
  }

  // Read before the new chat exists: `Agent.loadChat` resolves the agent's latest chat.
  const objects = yield* loadAgentObjects(agent);
  const skills = yield* sessionSkills(agent);

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({
      [Obj.Meta]: { keys: direct ? [key, AgentChannels.directKey(channel.id)] : [key] },
      [Obj.Parent]: agent,
      name: title,
      feed: Ref.make(feed),
      instructions: agent.instructions,
    }),
  );

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

/**
 * The skills the channel's backend declares on its config type ({@link Skill.SkillsAnnotation}): how the agent
 * answers there (posting, reacting, mailing) is the backend's to provide, so the agent core names no channel.
 */
const channelSkills = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const config = yield* Database.load(channel.backend.config).pipe(Effect.orElseSucceed(() => undefined));
  return config ? Skill.annotatedSkillRefs(config) : [];
});

/** Binds the channel's skills to a chat made before the channel declared them; a skill already bound is skipped. */
const bindChannelSkills = Effect.fnUntraced(function* (chat: Chat.Chat, channel: Channel.Channel) {
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
