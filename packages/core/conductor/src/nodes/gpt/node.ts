//
// Copyright 2025 DXOS.org
//

import { Effect, Layer, Schema, Stream, Struct } from 'effect';

import { DEFAULT_EDGE_MODEL, type GenerationStreamEvent, ToolId } from '@dxos/ai';
import { AiService } from '@dxos/ai';
import { AISession } from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { contextFromScope } from '@dxos/effect';
import { QueueService, ToolResolverService } from '@dxos/functions';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { EventLogger } from '../../services';
import { defineComputeNode, ValueBag } from '../../types';
import { StreamSchema } from '../../util';

// TODO(dmaretskyi): Use `Schema.declare` to define the schema.
// TODO(dmaretskyi): What's the type for the stream output.
const GptStreamEventSchema = Schema.Any as Schema.Schema<unknown>;

export const GptMessage = Schema.Struct({
  role: Schema.Union(Schema.Literal('system'), Schema.Literal('user')),
  message: Schema.String,
});

export type GptMessage = Schema.Schema.Type<typeof GptMessage>;

export const GptInput = Schema.Struct({
  /**
   * System instruction.
   */
  systemPrompt: Schema.optional(Schema.String),

  /**
   * User prompt.
   */
  prompt: Schema.String,

  /**
   * Additional context to pass before the user prompt.
   */
  context: Schema.optional(Schema.Any),

  /**
   * Model to use.
   */
  model: Schema.optional(Schema.String),

  /**
   * Conversation queue.
   * If specified, node will read the history, and write the new messages to the queue.
   */
  conversation: Schema.optional(Type.Ref(Queue)),

  /**
   * History messages.
   * Cannot be used together with `conversation`.
   */
  history: Schema.optional(Schema.Array(DataType.Message)),

  /**
   * Tools to use.
   */
  tools: Schema.optional(Schema.Array(ToolId)),
});

export type GptInput = Schema.Schema.Type<typeof GptInput>;

export const GptOutput = Schema.Struct({
  /**
   * Messages emitted by the model.
   */
  messages: Schema.Array(DataType.Message),

  /**
   * Artifact emitted by the model.
   */
  artifact: Schema.optional(Schema.Any),

  /**
   * AI response as text.
   */
  text: Schema.String,

  /**
   * Model's reasoning.
   */
  cot: Schema.optional(Schema.String),

  /**
   * Stream of tokens emitted by the model.
   */
  tokenStream: StreamSchema(GptStreamEventSchema),

  /**
   * Number of tokens emitted by the model.
   */
  tokenCount: Schema.Number,

  /**
   * Conversation queue containing the history and model's response.
   * Present if the conversation was passed as an input.
   */
  conversation: Schema.optional(Type.Ref(Queue)),
});

export type GptOutput = Schema.Schema.Type<typeof GptOutput>;

export const gptNode = defineComputeNode({
  input: GptInput,
  output: GptOutput,
  exec: (input) =>
    Effect.gen(function* () {
      const { systemPrompt, prompt, context, history, conversation, tools = [] } = yield* ValueBag.unwrap(input);
      assertArgument(history === undefined || conversation === undefined, 'Cannot use both history and conversation');

      const { queues } = yield* QueueService;

      const historyMessages = conversation
        ? yield* Effect.tryPromise({
            try: () => queues.get<DataType.Message>(conversation.dxn).queryObjects(),
            catch: (e) => e as Error,
          })
        : history ?? [];

      log.info('generating', { systemPrompt, prompt, historyMessages, tools });

      const session = new AISession({
        operationModel: 'configured',
      });

      const ctx = yield* contextFromScope();
      const logger = yield* EventLogger;

      session.streamEvent.on(ctx, (event) => {
        logger.log({
          type: 'custom',
          nodeId: logger.nodeId!,
          event,
        });
      });

      const eventStream = Stream.asyncPush<GenerationStreamEvent>(
        Effect.fnUntraced(function* (push) {
          const ctx = yield* contextFromScope();
          session.streamEvent.on(ctx, (event) => {
            // TODO(dmaretskyi): Fix streaming.
            // push.single(event);
          });

          session.done.on(ctx, () => {
            push.end();
          });
        }),
      );

      const fullPrompt = context != null ? `<context>\n${JSON.stringify(context)}\n</context>\n\n${prompt}` : prompt;

      // TODO(dmaretskyi): Is there a better way to satisfy deps?
      const model = AiService.model(DEFAULT_EDGE_MODEL).pipe(Layer.provide(Layer.succeed(AiService, yield* AiService)));

      // TODO(dmaretskyi): Should this use conversation instead?
      // TODO(dmaretskyi): Tools.
      const resultEffect = Effect.gen(function* () {
        const messages = yield* session
          .run({
            systemPrompt,
            prompt: fullPrompt,
            history: [...historyMessages],
          })
          .pipe(Effect.provide(model));
        log.info('messages', { messages });

        if (conversation) {
          yield* Effect.promise(() => queues.get<DataType.Message>(conversation.dxn).append([...messages]));
        }

        const text = messages
          .map((message) =>
            message.sender.role === 'assistant'
              ? message.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : []))
              : [],
          )
          .join('\n');

        const cot = messages
          .map((message) =>
            message.sender.role === 'assistant'
              ? message.blocks.flatMap((block) =>
                  block._tag === 'text' && block.disposition === 'cot' ? [block.text] : [],
                )
              : [],
          )
          .join('\n');

        return { messages, text, cot, artifact: undefined, tokenCount: 0 };
      });

      return ValueBag.make<GptOutput>({
        tokenStream: eventStream,
        messages: resultEffect.pipe(Effect.map(Struct.get('messages'))),
        tokenCount: resultEffect.pipe(Effect.map(Struct.get('tokenCount'))),
        text: resultEffect.pipe(Effect.map(Struct.get('text'))),
        cot: resultEffect.pipe(Effect.map(Struct.get('cot'))),
        artifact: resultEffect.pipe(Effect.map(Struct.get('artifact'))),
        conversation: resultEffect.pipe(Effect.andThen(() => Effect.succeed(conversation))),
      });
    }),
});
