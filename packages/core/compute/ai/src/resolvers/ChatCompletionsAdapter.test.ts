//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { expect } from 'vitest';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import * as ChatCompletionsAdapter from './ChatCompletionsAdapter.ts';

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
        ),
        { tags: ['manual'] },
      );

      it.effect(
        'streamText',
        Effect.fn(
          function* (_) {
            const parts = yield* LanguageModel.streamText({
              prompt: 'Count from 1 to 5, one number per line.',
            }).pipe(Stream.runCollect);

            log.info('parts', { count: parts.length });

            // Check we received streaming parts.
            const textDeltas = parts.filter((p) => p.type === 'text-delta');
            log.info('textDeltas', { count: textDeltas.length });

            // Collect all text.
            const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');
            log.info('fullText', { fullText });
          },
          Effect.provide(Layer.provide(createLayer(provider), Layer.empty)),
        ),
        { tags: ['manual'] },
      );
    });
  }
});

/**
 * Captures the request body the adapter sends, so the wire shape can be asserted without a live
 * server (the suites above are `manual` and need one).
 */
const captureRequestBody = (apiFormat: ChatCompletionsAdapter.ApiFormat, capture: (body: any) => void) => {
  const stub = HttpClient.make((request) =>
    Effect.gen(function* () {
      // The adapter encodes its JSON body to bytes; every other variant means the request was not
      // built the way this stub assumes, so fail loudly rather than capture nothing.
      const body = request.body;
      invariant(body._tag === 'Uint8Array', `unexpected request body: ${body._tag}`);
      capture(JSON.parse(new TextDecoder().decode(body.body)));
      const response =
        apiFormat === 'ollama'
          ? { model: 'test', created_at: '', message: { role: 'assistant', content: 'ok' }, done: true }
          : {
              id: 'test',
              object: 'chat.completion',
              created: 0,
              model: 'test',
              choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
            };
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
    }),
  );

  const clientLayer = ChatCompletionsAdapter.clientLayer({ baseUrl: 'http://test', apiFormat }).pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, stub)),
  );
  return ChatCompletionsAdapter.layer('test-model').pipe(Layer.provide(clientLayer));
};

/** A turn that already carries a tool call, so the request includes an assistant `tool_calls` entry. */
const promptWithToolCall = [
  { role: 'user' as const, content: [{ type: 'text' as const, text: 'look it up' }] },
  {
    role: 'assistant' as const,
    content: [{ type: 'tool-call' as const, id: 'call_1', name: 'lookup', params: { eid: 'abc' } }],
  },
  {
    role: 'tool' as const,
    content: [
      { type: 'tool-result' as const, id: 'call_1', name: 'lookup', isFailure: true, result: 'Invalid EID: abc' },
    ],
  },
];

describe('tool call encoding', () => {
  // Ollama decodes `arguments` into a map and rejects a JSON string with 400.
  it.effect(
    'Ollama receives tool call arguments as an object',
    Effect.fn(function* (_) {
      let body: any;
      yield* LanguageModel.generateText({ prompt: promptWithToolCall }).pipe(
        Effect.provide(captureRequestBody('ollama', (captured) => (body = captured))),
      );

      const args = body.messages.find((message: any) => message.role === 'assistant').tool_calls[0].function.arguments;
      expect(args).toEqual({ eid: 'abc' });
    }),
  );

  // OpenAI specifies the same field as a JSON-encoded string.
  it.effect(
    'OpenAI receives tool call arguments as a JSON string',
    Effect.fn(function* (_) {
      let body: any;
      yield* LanguageModel.generateText({ prompt: promptWithToolCall }).pipe(
        Effect.provide(captureRequestBody('openai', (captured) => (body = captured))),
      );

      const args = body.messages.find((message: any) => message.role === 'assistant').tool_calls[0].function.arguments;
      expect(args).toBe(JSON.stringify({ eid: 'abc' }));
    }),
  );
});
