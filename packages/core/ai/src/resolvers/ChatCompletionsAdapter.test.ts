//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import type * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';

import * as ChatCompletionsAdapter from './ChatCompletionsAdapter';

type ProviderConfig = {
  name: string;
  endpoint: string;
  apiFormat: ChatCompletionsAdapter.ApiFormat;
  model: string;
};

const providers: ProviderConfig[] = [
  {
    name: 'Ollama',
    endpoint: 'http://localhost:11434',
    apiFormat: 'ollama',
    model: 'llama3.2:1b',
  },
  {
    name: 'LM Studio',
    endpoint: 'http://localhost:1234',
    apiFormat: 'openai',
    model: 'llama-3.2-3b-instruct',
  },
];

/**
 * Create a test layer for a provider.
 */
const createLayer = (config: ProviderConfig) => {
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: config.endpoint,
    apiFormat: config.apiFormat,
  }).pipe(Layer.provide(FetchHttpClient.layer));
  return ChatCompletionsAdapter.layer(config.model).pipe(Layer.provide(clientLayer));
};

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

/**
 * Build a mock HttpClient layer whose single request handler returns the given effect.
 * The handler receives the request so tests can inspect it if needed.
 */
const makeMockLayer = (
  handler: (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, never, never>,
  overrides: Partial<ChatCompletionsAdapter.ChatCompletionsClientConfig> = {},
) => {
  const httpClient = HttpClient.make((request) => handler(request));
  const httpLayer = Layer.succeed(HttpClient.HttpClient, httpClient);
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: 'http://mock',
    apiFormat: 'openai',
    ...overrides,
  }).pipe(Layer.provide(httpLayer));
  return ChatCompletionsAdapter.layer('mock-model').pipe(Layer.provide(clientLayer));
};

const responseFromChunks = (
  request: HttpClientRequest.HttpClientRequest,
  chunks: Uint8Array[],
): HttpClientResponse.HttpClientResponse => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  return HttpClientResponse.fromWeb(request, new Response(body));
};

const responseStallAfterChunks = (
  request: HttpClientRequest.HttpClientRequest,
  chunks: Uint8Array[],
): HttpClientResponse.HttpClientResponse => {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
        return;
      }
      return new Promise<void>(() => {});
    },
  });
  return HttpClientResponse.fromWeb(request, new Response(body));
};

describe('ChatCompletionsLanguageModel SSE buffering', () => {
  it.effect('streamText emits all text deltas when a single SSE frame spans two HTTP chunks', ({ expect }) => {
    const chunks = [
      encode('data: {"id":"c","choices":[{"index":0,"delta":{"content":"hel'),
      encode(
        'lo"},"finish_reason":null}]}\ndata: {"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n',
      ),
    ];
    return Effect.gen(function* () {
      const parts = yield* LanguageModel.streamText({ prompt: 'hi' }).pipe(
        Stream.runCollect,
        Effect.map(Chunk.toArray),
      );
      const text = parts
        .filter((part) => part.type === 'text-delta')
        .map((part) => (part as { delta: string }).delta)
        .join('');
      expect(text).toBe('hello');
    }).pipe(Effect.provide(makeMockLayer((request) => Effect.succeed(responseFromChunks(request, chunks)))));
  });
});

describe('ChatCompletionsLanguageModel timeouts', () => {
  it.live('generateText fails with a timeout error when the HTTP response never arrives', ({ expect }) => {
    return Effect.gen(function* () {
      const exit = yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(
      Effect.provide(
        makeMockLayer(() => Effect.never, {
          requestTimeout: Duration.millis(50),
        }),
      ),
    );
  });

  it.live('streamText fails with an idle-timeout error when the stream stalls between chunks', ({ expect }) => {
    const initial = [encode('data: {"id":"c","choices":[{"index":0,"delta":{"content":"hi"},"finish_reason":null}]}\n')];
    return Effect.gen(function* () {
      const exit = yield* LanguageModel.streamText({ prompt: 'hi' }).pipe(Stream.runCollect, Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(
      Effect.provide(
        makeMockLayer((request) => Effect.succeed(responseStallAfterChunks(request, initial)), {
          streamIdleTimeout: Duration.millis(100),
        }),
      ),
    );
  });
});

describe('ChatCompletionsLanguageModel', () => {
  for (const provider of providers) {
    describe(provider.name, () => {
      it.effect(
        'generateText',
        Effect.fn(
          function* (_) {
            const response = yield* LanguageModel.generateText({
              prompt: 'What is 2 + 2? Reply with just the number.',
            });

            log.info('response', { text: response.text, usage: response.usage });
          },
          Effect.provide(Layer.provide(createLayer(provider), Layer.empty)),
          TestHelpers.taggedTest('llm'),
        ),
      );

      it.effect(
        'streamText',
        Effect.fn(
          function* (_) {
            const parts = yield* LanguageModel.streamText({
              prompt: 'Count from 1 to 5, one number per line.',
            }).pipe(Stream.runCollect, Effect.map(Chunk.toArray));

            log.info('parts', { count: parts.length });

            // Check we received streaming parts.
            const textDeltas = parts.filter((p) => p.type === 'text-delta');
            log.info('textDeltas', { count: textDeltas.length });

            // Collect all text.
            const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');
            log.info('fullText', { fullText });
          },
          Effect.provide(Layer.provide(createLayer(provider), Layer.empty)),
          TestHelpers.taggedTest('llm'),
        ),
      );
    });
  }
});
