//
// Copyright 2025 DXOS.org
//

import type { Context } from 'effect';
import { Effect, Stream } from 'effect';

import {
  type LLMTool,
  ObjectId,
  type AIServiceClient,
  type Message,
  type MessageImageContentBlock,
} from '@dxos/assistant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { makeValueBag, unwrapValueBag, type ComputeEffect, type ValueBag } from '../../types';
import { type GptOutput, type GptInput, type GptService } from '../gpt';
import { EventLogger } from '../event-logger';

export class EdgeGpt implements Context.Tag.Service<GptService> {
  // Images are not supported.
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _client: AIServiceClient) {}

  getAiServiceClient = () => this._client;

  public invoke(input: ValueBag<GptInput>): ComputeEffect<ValueBag<GptOutput>> {
    return Effect.gen(this, function* () {
      const { systemPrompt, prompt, history = [], tools = [] } = yield* unwrapValueBag(input);

      const messages: Message[] = [
        ...history,
        {
          id: ObjectId.random(),
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ];

      // Creating a temp thread for messages.
      // TODO(dmaretskyi): Allow to pass messages into the generate method directly.
      const spaceId = SpaceId.random();
      const threadId = ObjectId.random();
      yield* Effect.promise(() =>
        this._client.insertMessages(
          messages.map((msg) => ({ ...msg, id: ObjectId.random(), threadId, spaceId, foreignId: undefined })),
        ),
      );

      log.info('generating', { systemPrompt, prompt, history, tools: tools.map((tool) => tool.name) });
      const result = yield* Effect.promise(() =>
        this._client.generate({
          model: '@anthropic/claude-3-5-sonnet-20241022',
          threadId,
          spaceId,
          systemPrompt,
          tools: tools as LLMTool[],
        }),
      );

      const stream = Stream.fromAsyncIterable(result, (e) => new Error(String(e)));
      const [stream1, stream2] = yield* Stream.broadcast(stream, 2, { capacity: 'unbounded' });
      const outputMessagesEffect = Effect.promise(async () => result.complete());

      const outputWithAPrompt = Effect.gen(function* () {
        const outputMessages = yield* outputMessagesEffect;
        return [messages.at(-1)!, ...outputMessages];
      });

      const logger = yield* EventLogger;

      const text = Effect.gen(function* () {
        // Drain the stream
        yield* stream1.pipe(
          Stream.tap((token) => {
            logger.log({
              type: 'custom',
              nodeId: logger.nodeId!,
              event: token,
            });
            return Effect.void;
          }),
          Stream.runDrain,
        );

        const messages = yield* outputMessagesEffect;
        log.info('messages', { messages });
        return messages.map((msg) => msg.content.flatMap((c) => (c.type === 'text' ? [c.text] : []))).join('');
      });

      return makeValueBag<GptOutput>({
        messages: outputWithAPrompt,
        tokenCount: 0,
        text,
        tokenStream: stream2,
        cot: undefined,
        artifact: undefined,
      });
    });
  }
}
