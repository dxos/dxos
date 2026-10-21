//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { AgentChannels, AgentOperation } from '#types';

import { channelSkills, loadAgentBindings } from './ensure-channel-chat.ts';

/** Loaded on demand: the context runtime is heavy. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

const handler: Operation.WithHandler<typeof AgentOperation.OpenSession> = AgentOperation.OpenSession.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, title }) {
      const agent = yield* Database.load(agentRef);
      // Read before the new chat exists: `Agent.loadChat` resolves the agent's latest chat.
      const bindings = yield* loadAgentBindings(agent);
      const channels = yield* AgentChannels.loadChannels(agent);
      const declared = (yield* Effect.forEach(channels, channelSkills)).flat();

      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(
        Chat.make({
          [Obj.Meta]: { keys: [AgentChannels.sessionKey(feed.id)] },
          [Obj.Parent]: agent,
          name: title,
          feed: Ref.make(feed),
          instructions: agent.instructions,
        }),
      );

      const runtime = yield* Effect.context<Database.Service>();
      const AiContext = yield* Effect.promise(aiContextRuntime);
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          skills: [...bindings.skills, ...declared],
          objects: [...bindings.objects, Ref.make(chat)],
        }),
      );
      return { chat: Ref.make(chat), feed: chat.feed };
    }, Effect.scoped),
  ),
);

export default handler;
