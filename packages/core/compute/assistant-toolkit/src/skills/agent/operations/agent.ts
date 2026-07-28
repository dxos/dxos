//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiSession, ToolExecutionServices } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ContentBlock } from '@dxos/types';

import { Agent } from '../../../types';
import { AgentWorker } from './definitions';

export default AgentWorker.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, chat: chatRef, prompt, event }) {
      const agent = yield* Database.load(agentRef).pipe(
        Effect.catchTag('EntityNotFoundError', () => Effect.die(new Error('Unable to load agent object.'))),
      );
      invariant(Obj.instanceOf(Agent.Agent, agent));

      // Phase-B inversion: the chat comes with the invocation; legacy triggers fall back to `agent.chat`.
      const resolvedChatRef = chatRef ?? agent.chat;
      invariant(resolvedChatRef, 'Agent has no chat.');
      const chat = yield* Database.load(resolvedChatRef).pipe(
        Effect.catchTag('EntityNotFoundError', () => Effect.die(new Error('Unable to load agent chat object.'))),
      );
      const chatFeed = yield* Database.load(chat.feed).pipe(
        Effect.catchTag('EntityNotFoundError', () => Effect.die(new Error('Unable to load agent chat feed object.'))),
      );
      invariant(chatFeed, 'Agent chat feed not found.');
      // Steer the ephemeral session with the chat's instructions; a broken ref degrades to unsteered.
      const instructions = chat.instructions
        ? yield* Database.load(chat.instructions).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;
      const runtime = yield* Effect.runtime<Database.Service>();
      const session = yield* EffectEx.acquireReleaseResource(
        () => new AiSession.Session({ feed: chatFeed, runtime, instructions: instructions ? [instructions] : [] }),
      );

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
            Layer.mergeAll(AiService.model('com.anthropic.model.claude-opus-4-8.default'), ToolExecutionServices).pipe(
              Layer.provideMerge(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })),
            ),
          ),
          Effect.retry({ times: 2 }),
        );
    }, Effect.scoped),
  ),
  Operation.opaqueHandler,
);
