//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

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
