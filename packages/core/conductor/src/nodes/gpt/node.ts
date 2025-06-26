import { Effect, Schema } from 'effect';

import { DEFAULT_EDGE_MODEL, type GenerationStreamEvent, Message, Tool } from '@dxos/ai';
import { Obj, Type } from '@dxos/echo';
import { ATTR_TYPE } from '@dxos/echo-schema';
import { AiService, QueueService } from '@dxos/functions';
import { log } from '@dxos/log';

import { EventLogger } from '../../services';
import { defineComputeNode, ValueBag } from '../../types';
import { StreamSchema } from '../../util';

import { Stream } from 'effect';

import { type AiServiceClient, type GenerateRequest, MixedStreamParser } from '@dxos/ai';
import { makePushIterable } from '@dxos/async';
import { Queue } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';

// TODO(dmaretskyi): Use `Schema.declare` to define the schema.
const GptStreamEventSchema = Schema.Any as Schema.Schema<GenerationStreamEvent>;

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
  history: Schema.optional(Schema.Array(Message)),

  /**
   * Tools to use.
   */
  tools: Schema.optional(Schema.Array(Tool)),
});

export type GptInput = Schema.Schema.Type<typeof GptInput>;

export const GptOutput = Schema.Struct({
  messages: Schema.Array(Message),
  artifact: Schema.optional(Schema.Any),
  text: Schema.String,
  cot: Schema.optional(Schema.String),
  tokenStream: StreamSchema(GptStreamEventSchema),
  tokenCount: Schema.Number,
});

export type GptOutput = Schema.Schema.Type<typeof GptOutput>;

export const gptNode = defineComputeNode({
  input: GptInput,
  output: GptOutput,
  exec: (input) =>
    Effect.gen(function* () {
      const { systemPrompt, prompt, history, conversation, tools = [] } = yield* ValueBag.unwrap(input);
      const { client: aiClient } = yield* AiService;
      const { queues } = yield* QueueService;
      assertArgument(history === undefined || conversation === undefined, 'Cannot use both history and conversation');

      const historyMessages = conversation
        ? yield* Effect.promise(() => queues.get<Message>(conversation.dxn).queryObjects())
        : history ?? [];

      const promptMessage: Message = Obj.make(Message, {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      });

      const messages: Message[] = [...historyMessages, promptMessage];

      log.info('generating', { systemPrompt, prompt, historyMessages, tools: tools.map((tool) => tool.name) });
      const generationStream = yield* Effect.promise(() =>
        generate(aiClient, {
          model: DEFAULT_EDGE_MODEL,
          history: messages,
          systemPrompt,
          tools: tools as Tool[],
        }),
      );
      const logger = yield* EventLogger;

      const stream = Stream.fromAsyncIterable(generationStream, (e) => new Error(String(e))).pipe(
        Stream.tap((event) => {
          logger.log({
            type: 'custom',
            nodeId: logger.nodeId!,
            event,
          });
          return Effect.void;
        }),
      );

      // Separate tokens into a separate stream.
      const [resultStream, tokenStream] = yield* Stream.broadcast(stream, 2, { capacity: 'unbounded' });

      const outputMessages = yield* resultStream.pipe(
        Stream.runDrain,
        Effect.map(() => generationStream.result),
        Effect.tap((messages) => {
          if (conversation) {
            return Effect.promise(() => queues.get<Message>(conversation.dxn).append([promptMessage, ...messages]));
          }
        }),
        Effect.cached, // Cache the result to avoid re-draining the stream.
      );

      const outputWithAPrompt = outputMessages.pipe(
        Effect.map((messages) =>
          // TODO(dmaretskyi): Why do we need to prepend the last message
          [messages.at(-1)!, ...messages].map((msg) => ({
            [ATTR_TYPE]: Type.getDXN(Message),
            ...msg,
          })),
        ),
      );

      const text = outputWithAPrompt.pipe(
        Effect.map((messages) =>
          messages
            .map((message) => message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])))
            .join(''),
        ),
      );

      const cot = outputWithAPrompt.pipe(
        Effect.map(
          (messages) =>
            messages
              .at(-1)!
              .content.filter((block) => block.type === 'text')
              .find((block) => block.disposition === 'cot')?.text,
        ),
      );

      const artifact = Effect.gen(function* () {
        const textContent = yield* text;
        const begin = textContent.lastIndexOf('<artifact>');
        const end = textContent.indexOf('</artifact>');
        if (begin === -1 || end === -1) {
          return undefined;
        }

        const artifactData = textContent.slice(begin + '<artifact>'.length, end).trim();

        return artifactData;
      });

      // TODO(burdon): Parse COT on the server (message ontology).
      return ValueBag.make<GptOutput>({
        messages: outputWithAPrompt,
        tokenCount: 0,
        text,
        tokenStream,
        cot,
        artifact,
      });
    }),
});

const generate = async (
  ai: AiServiceClient,
  generationRequest: GenerateRequest,
  { abort }: { abort?: AbortSignal } = {},
): Promise<GenerateResult> => {
  const stream = await ai.execStream(generationRequest);
  const parser = new MixedStreamParser();
  const resultIterable = makePushIterable<GenerationStreamEvent>();

  let completed = false;
  parser.streamEvent.on((event) => {
    log.info('stream event', { event });
    resultIterable.next(event);
  });
  const messages = await parser.parse(stream);
  completed = true;

  resultIterable.return(messages);

  abort?.addEventListener('abort', () => {
    if (!completed) {
      resultIterable.throw(new Error('Aborted'));
    }
  });

  return {
    [Symbol.asyncIterator]: resultIterable[Symbol.asyncIterator],
    get result() {
      if (!completed) {
        throw new Error('Iterable not completed');
      }

      return messages;
    },
  };
};

interface GenerateResult extends AsyncIterable<GenerationStreamEvent> {
  /**
   * @throws If the iterable is not completed.
   */
  get result(): Message[];
}
