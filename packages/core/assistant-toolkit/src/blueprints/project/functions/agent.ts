//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiConversation, ToolExecutionServices } from '@dxos/assistant';
import { Database, DXN, Feed, Obj } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { FunctionInvocationService, FunctionNotFoundError } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { Operation, OperationRegistry } from '@dxos/operation';

import { Agent } from '../../../types';
import { AgentWorker } from './definitions';

/**
 * Creates a FunctionInvocationService that propagates the conversation DXN to child operations.
 * This ensures nested operations (e.g., get-context) can resolve AiContextService.
 */
const functionInvocationServiceWithConversation = (
  conversationDxn: DXN,
): Layer.Layer<FunctionInvocationService, never, OperationRegistry.Service | Operation.Service> =>
  Layer.effect(
    FunctionInvocationService,
    Effect.gen(function* () {
      const operationRegistry = yield* OperationRegistry.Service;
      const operationInvoker = yield* Operation.Service;
      return FunctionInvocationService.of({
        invokeFunction: <I, O>(operationDef: Operation.Definition<I, O, any>, input: I) =>
          operationInvoker.invoke(operationDef, input, { conversation: conversationDxn.toString() }).pipe(Effect.orDie),
        resolveFunction: (key: string) =>
          operationRegistry.resolve(key).pipe(
            Effect.flatten,
            Effect.catchTag('NoSuchElementException', () => Effect.fail(new FunctionNotFoundError(key))),
          ),
      });
    }),
  );

export default AgentWorker.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, prompt, event }) {
      const agent = yield* Database.load(agentRef);
      invariant(Obj.instanceOf(Agent.Agent, agent));
      invariant(agent.chat, 'Agent has no chat.');

      const chatFeed = yield* agent.chat.pipe(
        Database.load,
        Effect.flatMap((chat) => Database.load(chat.feed)),
      );
      invariant(chatFeed, 'Agent chat feed not found.');
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed: chatFeed, runtime }));

      const agentsInContext = conversation.context.getObjects().filter(Obj.instanceOf(Agent.Agent));
      if (agentsInContext.length !== 1) {
        throw new Error('There should be exactly one agent in context. Got: ' + agentsInContext.length);
      }

      if (!prompt && !event) {
        throw new Error('Either prompt or event must be provided.');
      }

      let input = '';
      if (prompt) {
        input += `${prompt}\n\n`;
      }
      if (event) {
        input += `<event>\n${JSON.stringify(event, null, 2)}\n</event>\n\n`;
      }

      const feedDxn = Obj.getDXN(chatFeed);
      yield* conversation
        .createRequest({
          prompt: input,
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(AiService.model('@anthropic/claude-opus-4-6'), ToolExecutionServices).pipe(
              Layer.provideMerge(functionInvocationServiceWithConversation(feedDxn)),
            ),
          ),
          Effect.retry({ times: 2 }),
        );
    }, Effect.scoped),
  ),
  Operation.opaqueHandler,
);
