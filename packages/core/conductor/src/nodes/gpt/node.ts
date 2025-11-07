//
// Copyright 2025 DXOS.org
//

import * as Response from '@effect/ai/Response';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as PubSub from 'effect/PubSub';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Struct from 'effect/Struct';

import { AiService, DEFAULT_EDGE_MODEL, ToolExecutionService, ToolId, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { ComputeEventLogger, QueueService, TracingService } from '@dxos/functions-runtime';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { ValueBag, defineComputeNode } from '../../types';
import { StreamSchema } from '../../util';

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
  history: Schema.optional(Schema.Array(DataType.Message.Message)),

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
  messages: Schema.Array(DataType.Message.Message),

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
  tokenStream: StreamSchema(Response.StreamPart(Toolkit.empty)),

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
  exec: Effect.fnUntraced(function* (input) {
    const { systemPrompt, prompt, context, history, conversation, tools = [] } = yield* ValueBag.unwrap(input);
    assertArgument(
      history === undefined || conversation === undefined,
      'history|conversation',
      'Cannot use both history and conversation',
    );

    const { queues } = yield* QueueService;
    const historyMessages = conversation
      ? yield* Effect.tryPromise({
          try: () => queues.get<DataType.Message.Message>(conversation.dxn).queryObjects(),
          catch: (e) => e as Error,
        })
      : (history ?? []);

    log.info('generating', { systemPrompt, prompt, historyMessages, tools });

    const session = new AiSession({
      operationModel: 'configured',
    });

    const tokenPubSub = yield* PubSub.unbounded<Response.StreamPart<any>>();
    const observer = GenerationObserver.make({
      onPart: (event) =>
        Effect.gen(function* () {
          logger.log({ type: 'custom', nodeId: logger.nodeId!, event });
          yield* PubSub.publish(tokenPubSub, event);
        }),
    });

    const logger = yield* ComputeEventLogger;
    const fullPrompt = context != null ? `<context>\n${JSON.stringify(context)}\n</context>\n\n${prompt}` : prompt;

    // TODO(dmaretskyi): Is there a better way to satisfy deps?
    const runDeps = Layer.mergeAll(
      AiService.model(DEFAULT_EDGE_MODEL).pipe(
        Layer.provide(Layer.succeed(AiService.AiService, yield* AiService.AiService)),
      ),
      // TODO(dmaretskyi): Move them out.
      ToolResolverService.layerEmpty,
      ToolExecutionService.layerEmpty,
      TracingService.layerNoop,
    );

    // TODO(dmaretskyi): Should this use conversation instead?
    // TODO(dmaretskyi): Tools.
    const resultEffect = Effect.gen(function* () {
      const messages = yield* session
        .run({
          system: systemPrompt,
          prompt: fullPrompt,
          history: [...historyMessages],
          observer,
        })
        .pipe(Effect.provide(runDeps));
      log.info('messages', { messages });

      if (conversation) {
        yield* Effect.promise(() => queues.get<DataType.Message.Message>(conversation.dxn).append([...messages]));
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
      tokenStream: Stream.fromPubSub(tokenPubSub) as Stream.Stream<Response.StreamPart<{}>, never, never>,
      messages: resultEffect.pipe(Effect.map(Struct.get('messages'))),
      tokenCount: resultEffect.pipe(Effect.map(Struct.get('tokenCount'))),
      text: resultEffect.pipe(Effect.map(Struct.get('text'))),
      cot: resultEffect.pipe(Effect.map(Struct.get('cot'))),
      artifact: resultEffect.pipe(Effect.map(Struct.get('artifact'))),
      conversation: resultEffect.pipe(Effect.andThen(() => Effect.succeed(conversation))),
    });
  }),
});
