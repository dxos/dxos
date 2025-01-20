//
// Copyright 2025 DXOS.org
//

import type { Context } from 'effect';
import { Effect, Stream } from 'effect';

import {
  ObjectId,
  type AIServiceClient,
  type LLMTool,
  type Message,
  type MessageImageContentBlock,
} from '@dxos/assistant';
import { ECHO_ATTR_TYPE } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type GptInput, type GptOutput } from '../../nodes';
import { makeValueBag, unwrapValueBag, type ComputeEffect, type ValueBag } from '../../types';
import { EventLogger } from '../event-logger';
import { IMAGE_TYPENAME, type GptService } from '../gpt';

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

      const text = Effect.gen(this, function* () {
        // Drain the stream
        yield* stream1.pipe(
          Stream.tap((event) => {
            logger.log({
              type: 'custom',
              nodeId: logger.nodeId!,
              event,
            });
            return Effect.void;
          }),
          Stream.runDrain,
        );

        const messages = yield* outputMessagesEffect;
        log.info('messages', { messages });
        return messages.map((msg) => msg.content.flatMap((c) => (c.type === 'text' ? [c.text] : []))).join('');
      });

      const artifact = Effect.gen(this, function* () {
        const output = yield* outputMessagesEffect;

        for (const msg of output) {
          for (const content of msg.content) {
            if (content.type === 'image') {
              log.info('save image to cache', { id: content.id, mediaType: content.source?.media_type });
              this.imageCache.set(content.id!, content);
            }
          }
        }

        const textContent = yield* text;
        const begin = textContent.lastIndexOf('<artifact>');
        const end = textContent.indexOf('</artifact>');
        if (begin === -1 || end === -1) {
          return undefined;
        }

        const artifactData = textContent.slice(begin + '<artifact>'.length, end).trim();
        const imageMatch = artifactData.match(/<image id="([^"]*)" prompt="([^"]*)" \/>/);
        if (imageMatch) {
          const [, id, prompt] = imageMatch;
          return {
            [ECHO_ATTR_TYPE]: IMAGE_TYPENAME,
            id,
            prompt,
            source: this.imageCache.get(id)?.source,
          };
        }
        return artifactData;
      });

      // TODO(burdon): Parse COT on the server (message ontology).
      return makeValueBag<GptOutput>({
        messages: outputWithAPrompt,
        tokenCount: 0,
        text,
        tokenStream: stream2,
        cot: undefined,
        artifact,
      });
    });
  }
}
