import { GptOutput } from '../gpt';

import type { Context, Scope } from 'effect';
import type { GptInput, GptService } from '../gpt';
import { LLMTool, ObjectId, type AIServiceClient, type Message, type MessageImageContentBlock } from '@dxos/assistant';
import { Console, Effect, Stream } from 'effect';
import { log } from '@dxos/log';
import { SpaceId } from '@dxos/keys';
import { makeValueBag, unwrapValueBag, type ComputeEffect, type ComputeRequirements, type NotExecuted, type ValueBag } from '../../schema';

export class EdgeGpt implements Context.Tag.Service<GptService> {
  // Images are not supported.
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _client: AIServiceClient) {}

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
      yield* Effect.promise(() => this._client.insertMessages(messages.map((msg) => ({ ...msg, threadId, spaceId }))));

      log.info('generating', { systemPrompt, prompt, tools: tools.map((tool) => tool.name) });
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
      const outputMessages = Effect.promise(() => result.complete());

      const text = Effect.gen(function* () {
        // Drain the stream
        yield* stream1.pipe(
          // Stream.tap((token) => Console.log(token)),
          Stream.runDrain,
        );

        const messages = yield* outputMessages;
        log.info('messages', { messages });
        return messages.map((msg) => msg.content.flatMap((c) => (c.type === 'text' ? [c.text] : []))).join('');
      });

      return makeValueBag<GptOutput>({
        messages: outputMessages,
        tokenCount: 0,
        text,
        tokenStream: stream2,
        cot: undefined,
        artifact: undefined,
      });
    });
  }
}