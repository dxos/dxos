//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit, ModelName } from '@dxos/ai';
import {
  AiConversation,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

import { PromptError } from '../../errors';
import * as Chat from '../../types/Chat';
import { AgentPrompt } from './definitions';

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-6';

export default AgentPrompt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* (data) {
        log.info('processing input', { input: data.input });

        const input = yield* Ref.isRef(data.input)
          ? Database.load(data.input).pipe(Effect.map(Obj.toJSON))
          : Effect.succeed(data.input);

        yield* Database.flush();
        const prompt = yield* Database.load(data.prompt);
        yield* TracingService.emitStatus({ message: `Running ${prompt.id}` });

        log.info('starting agent', { prompt: prompt.id, input });

        const blueprints = yield* Function.pipe(
          prompt.blueprints,
          Effect.forEach(Database.loadOption),
          Effect.map(Array.filter(Option.isSome)),
          Effect.map(Array.map((option) => option.value)),
        );

        const objects = yield* Function.pipe(
          prompt.context,
          Effect.forEach(Database.loadOption),
          Effect.map(Array.filter(Option.isSome)),
          Effect.map(Array.map((option) => option.value)),
        );

        const promptInstructions = yield* Database.load(prompt.instructions.source);
        let promptText = Template.process(promptInstructions.content, input);

        if (input !== undefined) {
          promptText += `\n<input>${JSON.stringify(input)}</input>`;
        }

        let systemText = trim`
          You are an agent running in the non-interactive mode.
          The user is unable to see what you are doing, and cannot answer any questions.
          Do not ask questions.
          Complete the task before you, and at the end call [completeJob] with the output.
          If you are unable to complete the task, call [completeJob] with the failure reason.
          If no output is required, call [completeJob] with { "success": "undefined" }
          Do not stop until you call [completeJob].
        `;
        if (data.systemInstructions) {
          systemText += `\n\n${data.systemInstructions}`;
        }

        const modelLayer = AiService.model(data.model ?? DEFAULT_MODEL);

        let feed: Feed.Feed;
        if (data.chat) {
          const chat = yield* Database.load(data.chat);
          invariant(Obj.instanceOf(Chat.Chat, chat), 'Expected Chat object.');
          feed = yield* Database.load(chat.feed);
        } else {
          feed = yield* Database.add(Feed.make());
        }

        const resultSink = yield* Deferred.make<unknown, PromptError>();
        const promptToolkit = makePromptAgentToolkit({
          output: Schema.Any, // TODO(dmaretskyi): Use prompt's output schema.
          resultSink,
        });

        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime }));

        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
            objects: objects.map((object) => Ref.make(object as Obj.Unknown)),
          }),
        );

        yield* conversation
          .createRequest({
            prompt: promptText,
            system: systemText,
            toolkit: promptToolkit.toolkit,
          })
          .pipe(
            Effect.provide(
              Layer.mergeAll(
                modelLayer,
                promptToolkit.layer,
                ToolExecutionService({ feed }),
                makeToolResolverFromOperations(),
              ),
            ),
          );

        return yield* Deferred.poll(resultSink).pipe(
          Effect.flatten,
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', () =>
            Effect.gen(function* () {
              // Retry once if the agent did not signal task completion.
              yield* conversation
                .createRequest({
                  prompt: 'You must signal task completion by calling [completeJob] with the output or failure reason.',
                  system: systemText,
                  toolkit: promptToolkit.toolkit,
                })
                .pipe(
                  Effect.provide(
                    Layer.mergeAll(
                      modelLayer,
                      promptToolkit.layer,
                      ToolExecutionService({ feed }),
                      makeToolResolverFromOperations(),
                    ),
                  ),
                );

              return yield* Deferred.poll(resultSink).pipe(
                Effect.flatten,
                Effect.flatten,
                Effect.catchTag('NoSuchElementException', () => Effect.die('Agent did not signal task completion.')),
              );
            }),
          ),
        );
      },
      Effect.scoped,
      Effect.provide(TracingService.layerNoop),
    ),
  ),
  Operation.opaqueHandler,
);

const makePromptAgentToolkit = (options: {
  output: Schema.Schema.Any;
  resultSink: Deferred.Deferred<unknown, PromptError>;
}) => {
  class PromptAgentToolkit extends Toolkit.make(
    Tool.make('completeJob', {
      parameters: {
        success: Schema.optional(Schema.Any), // TODO(dmaretskyi): Pipe output schema here.
        failure: Schema.optional(
          Schema.Struct({
            message: Schema.String.annotations({
              description: 'Short message describing the error.',
            }),
            description: Schema.optional(Schema.String).annotations({
              description: 'Optional longer message describing in detail what went wrong',
            }),
          }),
        ),
      },
    }),
  ) {}
  const layer = PromptAgentToolkit.toLayer({
    completeJob: Effect.fnUntraced(function* (result) {
      if (result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new PromptError(result.failure.message, {
            description: result.failure.description,
          }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success);
      }
    }),
  });

  return GenericToolkit.make(PromptAgentToolkit, layer);
};

interface ToolExecutionServiceOptions {
  feed: Feed.Feed;
}

const ToolExecutionService = ({ feed }: ToolExecutionServiceOptions) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* Operation.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            log('invoking operation', { operationDef, input });
            const result = yield* operationInvoker
              .invoke(operationDef, input, {
                conversation: Obj.getDXN(feed).toString(),
              })
              .pipe(Effect.orDie);
            log('result', { result });
            return result;
          }),
      });
    }),
  );
