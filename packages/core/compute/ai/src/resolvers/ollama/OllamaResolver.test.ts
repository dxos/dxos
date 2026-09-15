//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { log } from '@dxos/log';

import * as AiModelResolver from '../../AiModelResolver.ts';
import * as AiService from '../../AiService.ts';
import * as Provider from '../../Provider.ts';
import { CalculatorLayer, CalculatorToolkit } from '../../testing/calculator.ts';
import * as OllamaResolver from './OllamaResolver.ts';

const MODEL = 'com.openai.model.gpt-oss-20b.default';

const ResolverLayer = OllamaResolver.make().pipe(Layer.provide(FetchHttpClient.layer));

// The catalog's shared model ids are served by several providers, so the provider must accompany the
// request — `(provider, id)` is the resolver key.
const ModelLayer = AiService.model(MODEL, { provider: Provider.ollama.id }).pipe(
  Layer.provide(AiModelResolver.buildAiService),
  Layer.provide(ResolverLayer),
);

describe('OllamaResolver', () => {
  describe(MODEL, () => {
    it.effect(
      'generateText',
      Effect.fn(function* (_) {
        const response = yield* LanguageModel.generateText({
          prompt: 'What is 2 + 2? Reply with just the number.',
        });

        log.info('response', { text: response.text, usage: response.usage });
      }, Effect.provide(ModelLayer)),
      { timeout: 120_000, tags: ['manual'] },
    );

    it.effect(
      'streamText',
      Effect.fn(function* (_) {
        const parts = yield* LanguageModel.streamText({
          prompt: 'Count from 1 to 5, one number per line.',
        }).pipe(Stream.runCollect);

        const textDeltas = parts.filter((p) => p.type === 'text-delta');
        const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');
        log.info('streamText', { partCount: parts.length, deltaCount: textDeltas.length, fullText });
      }, Effect.provide(ModelLayer)),
      { timeout: 120_000, tags: ['manual'] },
    );

    it.effect(
      'generateText with tools',
      Effect.fn(
        function* ({ expect }) {
          const response = yield* LanguageModel.generateText({
            toolkit: CalculatorToolkit,
            prompt: 'What is six times seven? Use the Calculator tool and just answer with the number.',
          });

          log.info('response', {
            text: response.text,
            toolCalls: response.toolCalls.length,
            usage: response.usage,
          });

          expect(response.toolCalls.length).toBeGreaterThan(0);
        },
        Effect.provide(CalculatorLayer),
        Effect.provide(ModelLayer),
      ),
      { timeout: 120_000, tags: ['manual'] },
    );

    it.effect(
      'streamText with tools',
      Effect.fn(
        function* ({ expect }) {
          const parts = yield* LanguageModel.streamText({
            toolkit: CalculatorToolkit,
            prompt: 'What is six times seven? Use the Calculator tool and just answer with the number.',
          }).pipe(Stream.runCollect);

          const toolCalls = parts.filter((p) => p.type === 'tool-call');
          log.info('streamText with tools', {
            partCount: parts.length,
            toolCallCount: toolCalls.length,
          });

          expect(toolCalls.length).toBeGreaterThan(0);
        },
        Effect.provide(CalculatorLayer),
        Effect.provide(ModelLayer),
      ),
      { timeout: 120_000, tags: ['manual'] },
    );
  });
});
