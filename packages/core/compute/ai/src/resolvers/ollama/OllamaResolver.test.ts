//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { log } from '@dxos/log';

import * as AiModelResolver from '../../AiModelResolver';
import * as AiService from '../../AiService';
import { CalculatorLayer, CalculatorToolkit } from '../../testing/calculator';
import * as OllamaResolver from './OllamaResolver';

const MODEL = 'gpt-oss:20b';

const ResolverLayer = OllamaResolver.make().pipe(Layer.provide(FetchHttpClient.layer));

const ModelLayer = AiService.model(MODEL).pipe(
  Layer.provide(AiModelResolver.AiModelResolver.buildAiService),
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
      { timeout: 120_000, tags: ['llm'] },
    );

    it.effect(
      'streamText',
      Effect.fn(function* (_) {
        const parts = yield* LanguageModel.streamText({
          prompt: 'Count from 1 to 5, one number per line.',
        }).pipe(Stream.runCollect, Effect.map(Chunk.toArray));

        const textDeltas = parts.filter((p) => p.type === 'text-delta');
        const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');
        log.info('streamText', { partCount: parts.length, deltaCount: textDeltas.length, fullText });
      }, Effect.provide(ModelLayer)),
      { timeout: 120_000, tags: ['llm'] },
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
      { timeout: 120_000, tags: ['llm'] },
    );

    it.effect(
      'streamText with tools',
      Effect.fn(
        function* ({ expect }) {
          const parts = yield* LanguageModel.streamText({
            toolkit: CalculatorToolkit,
            prompt: 'What is six times seven? Use the Calculator tool and just answer with the number.',
          }).pipe(Stream.runCollect, Effect.map(Chunk.toArray));

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
      { timeout: 120_000, tags: ['llm'] },
    );
  });
});
