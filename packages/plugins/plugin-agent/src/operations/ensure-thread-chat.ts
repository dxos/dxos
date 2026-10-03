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

import { AgentOperation, DiscordBinding } from '#types';

/** Loaded on demand: the context runtime is heavy and only needed when a thread's chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

type ContextBindings = { skills: Ref.Ref<Skill.Skill>[]; objects: Ref.Ref<Obj.Unknown>[] };

/**
 * The skills and objects bound to the agent's current chat, so a thread runs with the same context
 * as the agent's own conversation; an agent without a chat contributes itself only.
 */
export const loadAgentBindings = (agent: Agent.Agent) =>
  Effect.gen(function* () {
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

export type EnsureThreadChatProps = {
  agent: Agent.Agent;
  threadId: string;
  title?: string;
  channelId?: string;
  source?: DiscordBinding.ThreadSource;
};

/**
 * Returns the agent's chat for a Discord thread or DM channel, creating it on first contact.
 * Shared with `sendDiscordMessage`, which records what it posts in the same chat.
 */
export const ensureThreadChat = Effect.fnUntraced(function* ({
  agent,
  threadId,
  title,
  channelId,
  source = DiscordBinding.DISCORD_SOURCE,
}: EnsureThreadChatProps) {
  // Thread ids are global, but the same thread may be bridged to more than one agent.
  const existing = yield* Database.query(
    Query.select(Filter.foreignKeys(Chat.Chat, [DiscordBinding.threadKey(threadId, source)])),
  ).run;
  const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
  if (match) {
    return match;
  }

  // Read before the new chat exists: `Agent.loadChat` resolves the agent's latest chat.
  const bindings = yield* loadAgentBindings(agent);

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({
      [Obj.Meta]: {
        keys: [
          DiscordBinding.threadKey(threadId, source),
          ...(channelId ? [{ source: DiscordBinding.DISCORD_CHANNEL_SOURCE, id: channelId }] : []),
        ],
      },
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

const handler: Operation.WithHandler<typeof AgentOperation.EnsureThreadChat> = AgentOperation.EnsureThreadChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, threadId, title, channelId, source }) {
      const agent = yield* Database.load(agentRef);
      const chat = yield* ensureThreadChat({ agent, threadId, title, channelId, source });
      return { chat: Ref.make(chat), feed: chat.feed };
    }),
  ),
);

export default handler;
