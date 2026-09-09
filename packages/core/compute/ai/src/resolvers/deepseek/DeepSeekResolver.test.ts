//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { log } from '@dxos/log';

import * as AiModelResolver from '../../AiModelResolver';
import * as AiService from '../../AiService';
import * as Model from '../../Model';
import * as Provider from '../../Provider';
import { CalculatorLayer, CalculatorToolkit } from '../../testing/calculator';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';
import * as DeepSeekResolver from './DeepSeekResolver';

const FLASH = 'com.deepseek.model.deepseek-v4-flash.default';

/**
 * These tests talk to DeepSeek directly rather than through EDGE, so they exercise the resolver and
 * the chat-completions adapter without needing an EDGE deployment or a HALO identity. Set
 * `DEEPSEEK_API_KEY` to run them; the EDGE-routed path is covered by the ai-service proxy tests.
 */
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com';

const apiKey = process.env.DEEPSEEK_API_KEY ?? '';

const ClientLayer = ChatCompletionsAdapter.clientLayer({
  baseUrl: DEEPSEEK_ENDPOINT,
  apiFormat: 'openai',
  provider: 'deepseek',
  streamUsage: true,
  transformClient: (client) =>
    HttpClient.mapRequest(client, HttpClientRequest.setHeader('Authorization', `Bearer ${apiKey}`)),
}).pipe(Layer.provide(FetchHttpClient.layer));

const ResolverLayer = DeepSeekResolver.make().pipe(Layer.provide(ClientLayer));

const modelLayer = (options?: { thinking?: boolean }) =>
  AiService.model(FLASH, { provider: Provider.edge.id, ...options }).pipe(
    Layer.provide(AiModelResolver.buildAiService),
    Layer.provide(ResolverLayer),
  );

describe('DeepSeekResolver', () => {
  it('catalogs the model under the deepseek service', ({ expect }) => {
    const info = Model.get(Provider.edge.id, Model.all.find((model) => model.backend === 'deepseek-v4-flash')!.id);
    expect(info?.service).toBe('deepseek');
    expect(info?.backend).toBe('deepseek-v4-flash');
  });

  it.effect(
    'generateText reports numeric usage',
    Effect.fn(
      function* ({ expect }) {
        const response = yield* LanguageModel.generateText({
          prompt: 'What is 2 + 2? Reply with just the number.',
        });

        log.info('generateText', { text: response.text, usage: response.usage });
        expect(response.text.length).toBeGreaterThan(0);
        expect(response.usage.inputTokens.total).toBeGreaterThan(0);
        expect(response.usage.outputTokens.total).toBeGreaterThan(0);
      },
      Effect.provide(modelLayer({ thinking: false })),
    ),
    { timeout: 120_000, tags: ['manual'] },
  );

  it.effect(
    'streamText reports usage from the final chunk',
    Effect.fn(
      function* ({ expect }) {
        const parts = yield* LanguageModel.streamText({
          prompt: 'Count from 1 to 5, one number per line.',
        }).pipe(Stream.runCollect);

        const textDeltas = parts.filter((part) => part.type === 'text-delta');
        const finish = parts.find((part) => part.type === 'finish');
        log.info('streamText', { partCount: parts.length, deltaCount: textDeltas.length, finish });

        expect(textDeltas.length).toBeGreaterThan(0);
        // Usage only rides the stream when `stream_options.include_usage` was requested, which is
        // what EDGE meters on — a regression here bills every streamed request as usage_missing.
        expect(finish).toBeDefined();
        const usage = (finish as { usage: { inputTokens: { total: number }; outputTokens: { total: number } } }).usage;
        expect(usage.inputTokens.total).toBeGreaterThan(0);
        expect(usage.outputTokens.total).toBeGreaterThan(0);
      },
      Effect.provide(modelLayer({ thinking: false })),
    ),
    { timeout: 120_000, tags: ['manual'] },
  );

  it.effect(
    'thinking mode returns reasoning',
    Effect.fn(
      function* ({ expect }) {
        const response = yield* LanguageModel.generateText({
          prompt: 'What is 17 * 3? Answer with just the number.',
        });

        const reasoning = response.content.filter((part) => part.type === 'reasoning');
        log.info('thinking', { text: response.text, reasoningParts: reasoning.length });
        expect(reasoning.length).toBeGreaterThan(0);
      },
      Effect.provide(modelLayer({ thinking: true })),
    ),
    { timeout: 180_000, tags: ['manual'] },
  );

  it.effect(
    'generateText with tools',
    Effect.fn(
      function* ({ expect }) {
        const response = yield* LanguageModel.generateText({
          toolkit: CalculatorToolkit,
          prompt: 'What is six times seven? Use the Calculator tool and just answer with the number.',
        });

        log.info('tools', { text: response.text, toolCalls: response.toolCalls.length });
        expect(response.toolCalls.length).toBeGreaterThan(0);
      },
      Effect.provide(CalculatorLayer),
      Effect.provide(modelLayer({ thinking: false })),
    ),
    { timeout: 180_000, tags: ['manual'] },
  );
});
