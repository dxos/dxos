//
// Copyright 2025 DXOS.org
//

import * as Chat from '@effect/ai/Chat';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as NodeHttpClient from '@effect/platform-node/NodeHttpClient';
import { describe, expect, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as EffectFunction from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { AiParser } from '@dxos/ai';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import * as AiService from './AiService';
import { MemoizedAiService } from './memoization';
import { AiServiceTestingPreset, hasToolCall, testingLayer } from './testing';

// https://effect.website/docs/ai/tool-use/#5-bring-it-all-together
// https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/CHANGELOG.md
// https://discord.com/channels/795981131316985866/1338871274398679130

const OpenAiLayer = OpenAiClient.layerConfig({
  apiKey: Config.redacted('OPENAI_API_KEY'),
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

const AnthropicLayer = AnthropicClient.layerConfig({
  apiKey: Config.redacted('ANTHROPIC_API_KEY'),
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

const createChat = Effect.fn(function* (prompt: string) {
  const chat = yield* Chat.empty;
  const toolkit = yield* TestToolkit;

  // Initial request.
  // NOTE: Providing `toolkit` returns `AiRespose.WithToolCallResults`.
  let output = yield* chat.generateText({ toolkit, prompt });

  // Agentic loop.
  // TODO(burdon): Explain how this works?
  while (output.toolCalls.length > 0) {
    log.info('results', { results: output.toolCalls.length });
    output = yield* chat.generateText({ toolkit, prompt: Prompt.empty });
  }

  // Done.
  return output.text;
});

// Tool definitions.
const TestToolkit = Toolkit.make(
  Tool.make('calculator', {
    description: 'Basic calculator tool',
    parameters: {
      input: Schema.String.annotations({
        description: 'The calculation to perform.',
      }),
    },
    success: Schema.Struct({
      result: Schema.Number,
    }),
    failure: Schema.Never,
  }),
  Tool.make('get-date', {
    description: 'Get the current date',
    parameters: {
      // TODO(burdon): This isn't working.
      // location: Format.GeoPoint,
    },
    success: Schema.DateFromString,
  }),
);

// Tool handlers.
const toolkitLayer = TestToolkit.toLayer({
  ['calculator' as const]: ({ input }) =>
    Effect.gen(function* () {
      const result = (() => {
        // Restrict to basic arithmetic operations for safety.
        const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
        log.info('calculate', { sanitizedInput });

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        return Function(`"use strict"; return (${sanitizedInput})`)();
      })();

      // TODO(burdon): How to return an error.
      yield* Console.log(`Executing calculation: ${input} = ${result}`);
      return { result };
    }),
  ['get-date' as const]: () =>
    Effect.gen(function* () {
      return new Date('2025-10-01');
    }),
});

/**
 * Rationale:
 * - Separation of concerns: config, execution pipline, error handling/retry, tool dispatch, async.
 * - Uncouple tool definitions from tool implementation (late binding, composition).
 * - Affinity with effect schema.
 * - Leverage existing effect based conductor pipline.
 * - Simple API for plugins/artifacts.
 * - Ecosystem and design partner.
 */
describe('LanguageModel', () => {
  // Sanity test.
  it.effect(
    'Debug: Verify API configuration',
    Effect.fn(
      function* ({ expect }) {
        yield* Console.log('Testing API connectivity...');
        const { text } = yield* LanguageModel.generateText({ prompt: 'Hello, respond with "API is working"' });
        yield* Console.log('API Response received:', text);
        expect(text).to.contain('API is working');
      },
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.timeout('10 seconds'),
      Effect.retry({ times: 1 }),
      Effect.provide(OpenAiLayer),
      TestHelpers.runIf(process.env.OPENAI_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
  );

  it.effect(
    'should make a tool call',
    Effect.fn(
      function* ({ expect }) {
        const createProgram = (prompt: string) =>
          LanguageModel.generateText({
            toolkit: TestToolkit,
            prompt,
          }).pipe(
            // Effect.tap((response) => Console.log(response)),
            Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
            Effect.retry(EffectFunction.pipe(Schedule.exponential('1 second'), Schedule.intersect(Schedule.recurs(2)))),
            Effect.timeout('30 seconds'),
          );

        const result = yield* createProgram(
          'What is six times seven? Use appropriate tools and just answer with the number.',
        );
        expect(result).toBeDefined();
      },
      Effect.provide([toolkitLayer, OpenAiLayer]),
      TestHelpers.runIf(process.env.OPENAI_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
  );

  it.effect(
    'should process an agentic loop using OpenAI',
    Effect.fn(function* ({ expect }) {
      // @effect-diagnostics-next-line multipleEffectProvide:off
      const createProgram = (prompt: string) =>
        createChat(prompt).pipe(
          Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
          Effect.provide(OpenAiLayer),
          Effect.provide(toolkitLayer),
        );

      const result = yield* createProgram('What is six times seven?');
      log.info('result', { result });
      expect(result).toContain('42');
    }, TestHelpers.runIf(process.env.OPENAI_API_KEY)),
  );

  it.effect(
    'should process an agentic loop using Claude',
    Effect.fn(
      function* ({ expect }) {
        // @effect-diagnostics-next-line multipleEffectProvide:off
        const createProgram = (prompt: string) =>
          createChat(prompt).pipe(
            Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
            Effect.provide(AnthropicLayer),
            Effect.provide(toolkitLayer),
          );

        const result = yield* createProgram('What is six times seven?');
        log.info('result', { result });
        expect(result).toContain('42');
      },
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
  );

  it.effect(
    'streaming',
    Effect.fn(
      function* (_) {
        const stream = LanguageModel.streamText({ prompt: 'What is six times seven?' });
        yield* Stream.runForEach(
          stream,
          Effect.fnUntraced(function* (item) {
            log.info('item', { item, time: new Date().toISOString() });
          }),
        );
      },
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'streaming with tools',
    Effect.fn(
      function* (_) {
        const chat = yield* Chat.empty;
        const toolkit = yield* TestToolkit;

        let prompt: Prompt.RawInput = 'What is six times seven?';
        do {
          const stream = chat.streamText({ toolkit, prompt });
          prompt = Prompt.empty;

          yield* Stream.runForEach(
            stream,
            Effect.fnUntraced(function* (item) {
              log.info('item', { item, time: new Date().toISOString() });
            }),
          );

          log.break();
        } while (yield* hasToolCall(chat));

        console.log(JSON.stringify(yield* chat.export, null, 2));
      },
      Effect.provide(toolkitLayer),
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  ); //

  it.effect(
    'with parser',
    Effect.fn(
      function* (_) {
        const system = trim`
          Before you answer emit your current status (what are you doing?) inside <status></status> XML tags.
          After your answer emit your suggestions for follow-up user prompts inside <suggestion></suggestion> XML tags.
        `;

        const chat = yield* Chat.empty;
        const toolkit = yield* TestToolkit;

        let prompt: Prompt.RawInput = Prompt.fromMessages([
          Prompt.makeMessage('system', { content: system }),
          Prompt.makeMessage('user', { content: [Prompt.makePart('text', { text: 'What is six times seven?' })] }),
        ]);

        do {
          const stream = chat.streamText({ prompt, toolkit }).pipe(AiParser.parseResponse());
          prompt = Prompt.empty;

          const result = yield* Stream.runCollect(stream).pipe(Effect.map(Chunk.toArray));
          log.info('result', { result });
          log.break();
        } while (yield* hasToolCall(chat));

        console.log(JSON.stringify(yield* chat.export, null, 2));
      },
      Effect.provide(toolkitLayer),
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'built-in search',
    Effect.fn(
      function* (_) {
        const toolkit = Toolkit.make(
          AnthropicTool.WebSearch_20250305({
            // ..
          }),
        );

        const prompt = Prompt.fromMessages([
          Prompt.makeMessage('user', { content: [Prompt.makePart('text', { text: 'What is DXOS?' })] }),
        ]);

        const result = yield* LanguageModel.generateText({ toolkit, prompt });
        log.info('result', { result });
      },
      Effect.provide(AnthropicLanguageModel.model('claude-opus-4-0')),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  ); //
});

const TestLayer = Layer.mergeAll(testingLayer, toolkitLayer, AiService.model('@anthropic/claude-sonnet-4-0')).pipe(
  Layer.provideMerge(MemoizedAiService.layerTest()),
  Layer.provide(AiServiceTestingPreset('direct')),
);

// TODO(wittjosiah): GeoPoint breaks Anthropic validation.
describe('Toolkit', () => {
  it.effect.skip(
    'can handle a geopoint tool parameter',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('What is the current date?');

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* TestToolkit,
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
