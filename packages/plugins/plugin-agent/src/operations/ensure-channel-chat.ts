//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Channel } from '@dxos/types';

import { AgentChannels, AgentOperation } from '#types';

/** Loaded on demand: the context runtime is heavy and only needed when a conversation's chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

type ContextBindings = { skills: Ref.Ref<Skill.Skill>[]; objects: Ref.Ref<Obj.Unknown>[] };

/**
 * The skills and objects bound to the agent's current chat, so a conversation runs with the same
 * context as the agent's own chat; an agent without a chat contributes itself only.
 */
export const loadAgentBindings = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const chat = yield* Agent.loadChat(agent);
  if (!chat) {
    return { skills: [], objects: [Ref.make<Obj.Unknown>(agent)] } satisfies ContextBindings;
  }

  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  return {
    skills: binder.getSkills().map(Skill.makeRef),
    objects: binder
      .getObjects()
      .filter((object) => !Obj.instanceOf(Chat.Chat, object))
      .map((object) => Ref.make(object)),
  } satisfies ContextBindings;
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
  // The same conversation may be bridged to more than one agent.
  const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [key]))).run;
  const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
  if (match) {
    return match;
  }

  // Read before the new chat exists: `Agent.loadChat` resolves the agent's latest chat.
  const bindings = yield* loadAgentBindings(agent);

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({
      [Obj.Meta]: { keys: [key] },
      [Obj.Parent]: agent,
      name: title,
      feed: Ref.make(feed),
      instructions: agent.instructions,
    }),
  );

  const runtime = yield* Effect.context<Database.Service>();
  const AiContext = yield* Effect.promise(aiContextRuntime);
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  yield* Effect.promise(() => binder.bind({ skills: bindings.skills, objects: [...bindings.objects, Ref.make(chat)] }));
  return chat;
}, Effect.scoped);

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
