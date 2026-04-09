//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, GenericToolkit, ModelName } from '@dxos/ai';
import {
  AiConversation,
  AiSession,
  GenerationObserver,
  ToolExecutionServices,
  createToolkit,
  functionInvocationServiceFromOperations,
} from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { Trace, TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { type Message } from '@dxos/types';

import { AgentPrompt } from './definitions';

import * as Chat from '../../types/Chat';
import { Cause, Deferred, Layer, Schema } from 'effect';
import { Tool, Toolkit } from '@effect/ai';
import type { Exit } from 'effect';
import { PromptError } from '../../errors';
import { trim } from '@dxos/util';

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-6';

const observer = GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'agent' }));

const lastTextFromMessages = (messages: Message.Message[]): string | undefined => {
  const blocks = messages.flatMap((message) => message.blocks);
  for (let index = blocks.length - 1; index >= 0; index--) {
    const block = blocks[index]!;
    if (block._tag === 'text') {
      return block.text;
    }
  }
  return undefined;
};

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
        const promptText = Template.process(promptInstructions.content, input);

        let systemText = trim`
          You are an agent runnning in the non-interactive mode.
          The user is unable to see what your are doing, and cannot answer any questions.
          Do not ask questions.
          Complete the task before you, and at the end call [complete_job] with the output.
          If you are unable to complete the task, call [complete_job] with the failure reason.
          If no output is required, call [complete_job] with { "success": "undefined" }
          Do not stop until you call [complete_job].
        `;
        if (data.systemInstructions) {
          systemText += `\n\n${data.systemInstructions}`;
        }

        const modelLayer = AiService.model(data.model ?? DEFAULT_MODEL);

        if (data.chat) {
          const chat = yield* Database.load(data.chat);
          invariant(Obj.instanceOf(Chat.Chat, chat), 'Expected Chat object.');
          const chatFeed = yield* Database.load(chat.feed);
          invariant(chatFeed, 'Chat feed not found.');
          const runtime = yield* Effect.runtime<Feed.FeedService>();

          const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed: chatFeed, runtime }));

          yield* Effect.promise(() =>
            conversation.context.bind({
              blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
              objects: objects.map((object) => Ref.make(object as Obj.Unknown)),
            }),
          );

          const messages = yield* conversation
            .createRequest({
              prompt: promptText,
              system: systemText,
              observer,
            })
            .pipe(Effect.provide(modelLayer));

          return {
            note: lastTextFromMessages(messages),
          };
        } else {
          const resultSink = yield* Deferred.make<unknown, PromptError>();
          const promptTookit = makePromptAgentToolkit({
            output: Schema.Any, // TODO(dmaretskyi): Use prompt's output schema.
            resultSink,
          });
          const toolkit = yield* createToolkit({ blueprints, genericToolkits: [promptTookit] });

          const session = new AiSession({ observer });
          yield* session
            .run({
              prompt: promptText,
              system: systemText,
              blueprints,
              objects: objects as Obj.Unknown[],
              toolkit,
            })
            .pipe(Effect.provide(modelLayer));

          return yield* Deferred.poll(resultSink).pipe(
            Effect.flatten,
            Effect.catchTag('NoSuchElementException', () => Effect.die('Agent did not signal task completion.')),
            Effect.flatten,
            Effect.mapError(
              (err) =>
                new PromptError(err.message ?? 'Agent failed with an unknown error.', {
                  chat: data.chat?.dxn.toString(),
                  descripion: err.context.descripion as string | undefined,
                  prompt: data.prompt.dxn.toString(),
                }),
            ),
          );
        }
      },
      Effect.scoped,
      Effect.provide(
        Layer.empty.pipe(
          Layer.provideMerge(ToolExecutionServices),
          Layer.provideMerge(functionInvocationServiceFromOperations),
          Layer.provideMerge(TracingService.layerNoop),
        ),
      ),
    ),
  ),
  Operation.opaqueHandler,
);

const makePromptAgentToolkit = (options: {
  output: Schema.Schema.Any;
  resultSink: Deferred.Deferred<unknown, PromptError>;
}) => {
  class PromptAgentToolkit extends Toolkit.make(
    Tool.make('complete_job', {
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
    complete_job: Effect.fnUntraced(function* (result) {
      if (result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new PromptError(result.failure.message, {
            descripion: result.failure.description,
          }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success);
      }
    }),
  });

  return GenericToolkit.make(PromptAgentToolkit, layer);
};
