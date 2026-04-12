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

import { Project } from '../../../types';
import { Agent } from './definitions';

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
          operationInvoker
            .invoke(operationDef, input, { conversation: conversationDxn.toString() })
            .pipe(Effect.orDie),
        resolveFunction: (key: string) =>
          operationRegistry.resolve(key).pipe(
            Effect.flatten,
            Effect.catchTag('NoSuchElementException', () => Effect.fail(new FunctionNotFoundError(key))),
          ),
      });
    }),
  );

export default Agent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ project: projectRef, prompt, event }) {
        const project = yield* Database.load(projectRef);
        invariant(Obj.instanceOf(Project.Project, project));
        invariant(project.chat, 'Project has no chat.');

        const chatFeed = yield* project.chat.pipe(
          Database.load,
          Effect.flatMap((chat) => Database.load(chat.feed)),
        );
        invariant(chatFeed, 'Project chat feed not found.');
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed: chatFeed, runtime }));

        const iniativesInContext = conversation.context.getObjects().filter(Obj.instanceOf(Project.Project));
        if (iniativesInContext.length !== 1) {
          throw new Error('There should be exactly one project in context. Got: ' + iniativesInContext.length);
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
      },
      Effect.scoped,
    ),
  ),
  Operation.opaqueHandler,
);
