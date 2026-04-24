//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiSession, ToolExecutionServices } from '@dxos/assistant';
import { Database, Feed, Obj } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ContentBlock } from '@dxos/types';

import { Agent } from '../../../types';
import { AgentWorker } from './definitions';

export default AgentWorker.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, prompt, event }) {
      const agent = yield* Database.load(agentRef).pipe(
        Effect.catchTag('ObjectNotFoundError', () => Effect.die(new Error('Unable to load agent object.'))),
      );
      invariant(Obj.instanceOf(Agent.Agent, agent));
      invariant(agent.chat, 'Agent has no chat.');

      const chatFeed = yield* agent.chat.pipe(
        Database.load,
        Effect.flatMap((chat) => Database.load(chat.feed)),
        Effect.catchTag('ObjectNotFoundError', () => Effect.die(new Error('Unable to load agent chat feed object.'))),
      );
      invariant(chatFeed, 'Agent chat feed not found.');
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const session = yield* acquireReleaseResource(() => new AiSession({ feed: chatFeed, runtime }));

      const agentsInContext = session.context.getObjects().filter(Obj.instanceOf(Agent.Agent));
      if (agentsInContext.length !== 1) {
        throw new Error('There should be exactly one agent in context. Got: ' + agentsInContext.length);
      }

      if (!prompt && !event) {
        throw new Error('Either prompt or event must be provided.');
      }

      let input: ContentBlock.Any[] = [];
      if (prompt) {
        input.push({ _tag: 'text', text: prompt, disposition: 'synthetic' });
      }
      if (event) {
        input.push({ _tag: 'text', text: JSON.stringify(event), disposition: 'synthetic' });
      }

      yield* session
        .createRequest({
          prompt: input,
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(AiService.model('@anthropic/claude-opus-4-6'), ToolExecutionServices).pipe(
              Layer.provideMerge(Operation.withInvocationOptions({ conversation: Obj.getDXN(chatFeed).toString() })),
            ),
          ),
          Effect.retry({ times: 2 }),
        );
    }, Effect.scoped),
  ),
  Operation.opaqueHandler,
);
