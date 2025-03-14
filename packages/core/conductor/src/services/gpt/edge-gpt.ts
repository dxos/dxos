//
// Copyright 2025 DXOS.org
//

import type { Context } from 'effect';
import { Effect, Stream } from 'effect';

import { type Tool, type Message, type ImageContentBlock } from '@dxos/artifact';
import {
  DEFAULT_LLM_MODEL,
  MixedStreamParser,
  type AIServiceClient,
  type GenerateRequest,
  type GenerationStreamEvent,
} from '@dxos/assistant';
import { ObjectId, ECHO_ATTR_TYPE, createStatic } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { IMAGE_TYPENAME, MESSAGE_TYPENAME, type GptService } from './gpt';
import { type GptInput, type GptOutput } from '../../nodes';
import { makeValueBag, unwrapValueBag, type ComputeEffect, type ValueBag } from '../../types';
import { EventLogger } from '../event-logger';
import { makePushIterable } from '@dxos/async';

export class EdgeGpt implements Context.Tag.Service<GptService> {
  // Images are not supported.
  public readonly imageCache = new Map<string, ImageContentBlock>();

  constructor(private readonly _client: AIServiceClient) {}

  // TODO(burdon): Not used?
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

      log.info('generating', { systemPrompt, prompt, history, tools: tools.map((tool) => tool.name) });
      const generationStream = yield* Effect.promise(() =>
        generate(this._client, {
          model: DEFAULT_LLM_MODEL,
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
        Effect.cached, // Cache the result to avoid re-draining the stream.
      );

      const outputWithAPrompt = outputMessages.pipe(
        Effect.map((messages) =>
          // TODO(dmaretskyi): Why do we need to prepend the last message
          [messages.at(-1)!, ...messages].map((msg) => ({
            [ECHO_ATTR_TYPE]: `dxn:type:${MESSAGE_TYPENAME}:0.1.0`,
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

      const artifact = Effect.gen(this, function* () {
        const output = yield* outputMessages;
        for (const message of output) {
          for (const content of message.content) {
            if (content.type === 'image') {
              log.info('save image to cache', { id: content.id, mediaType: content.source?.mediaType });
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
        tokenStream,
        cot,
        artifact,
      });
    });
  }
}

interface GenerateResult extends AsyncIterable<GenerationStreamEvent> {
  /**
   * @throws If the iterable is not completed.
   */
  get result(): Message[];
}

const generate = async (
  client: AIServiceClient,
  generationRequest: GenerateRequest,
  { abort }: { abort?: AbortSignal } = {},
): Promise<GenerateResult> => {
  const stream = await client.exec(generationRequest);
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
