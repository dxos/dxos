//
// Copyright 2025 DXOS.org
//

import { AiChat, AiInput, AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { NodeHttpClient } from '@effect/platform-node';
import { Config, Console, Effect, Layer, pipe, Schedule, Schema, Stream } from 'effect';
import { describe, it, test } from 'vitest';

import { log } from '@dxos/log';
import { runAndForwardErrors } from '@dxos/effect';

// https://effect.website/docs/ai/tool-use/#5-bring-it-all-together
// https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/CHANGELOG.md
// https://discord.com/channels/795981131316985866/1338871274398679130

// TODO(burdon): Implement MCP server for ECHO on CF.

/**
 * Rationale:
 * - Separation of concerns: config, execution pipline, error handling/retry, tool dispatch, async.
 * - Uncouple tool definitions from tool implementation (late binding, composition).
 * - Affinity with effect schema.
 * - Leverage existing effect based conductor pipline.
 * - Simple API for plugins/artifacts.
 * - Ecosystem and design partner.
 */
describe.runIf(!process.env.CI)('AiLanguageModel', () => {
  // Sanity test.
  it.runIf(process.env.OPENAI_API_KEY)('Debug: Verify API configuration', async ({ expect }) => {
    const program = Effect.gen(function* () {
      yield* Console.log('Testing API connectivity...');
      const { text } = yield* AiLanguageModel.generateText({ prompt: 'Hello, respond with "API is working"' });
      yield* Console.log('API Response received:', text);
      return text;
    }).pipe(
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.timeout('10 seconds'),
      Effect.retry({ times: 1 }),
    );

    const OpenAiLayer = OpenAiClient.layerConfig({
      apiKey: Config.redacted('OPENAI_API_KEY'),
    }).pipe(Layer.provide(NodeHttpClient.layerUndici));

    const result = await program.pipe(Effect.provide(OpenAiLayer), Effect.runPromise);
    expect(result).to.contain('API is working');
  });

  test('streaming', async () => {
    await Effect.gen(function* () {
      const stream = AiLanguageModel.streamText({ prompt: 'write a 45 page poem' });

      yield* Stream.runForEach(
        stream,
        Effect.fnUntraced(function* (item) {
          yield* Console.log('API Response received:', item.text);
        }),
      );
    }).pipe(
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      runAndForwardErrors,
    );
  });

  // Tool definitions.
  class Toolkit extends AiToolkit.make(
    AiTool.make('Calculator', {
      description: 'Test tool',
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
  ) {}

  // Tool handlers.
  const toolkitLayer = Toolkit.toLayer({
    Calculator: ({ input }) =>
      Effect.gen(function* () {
        const result = (() => {
          // Restrict to basic arithmetic operations for safety.
          const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
          log.info('calculate', { sanitizedInput });
          // eslint-disable-next-line no-new-func
          return Function(`"use strict"; return (${sanitizedInput})`)();
        })();

        yield* Console.log(`Executing calculation: ${input} = ${result}`);
        return { result };
      }),
  });

  // Providers.
  const OpenAiLayer = OpenAiClient.layerConfig({
    apiKey: Config.redacted('OPENAI_API_KEY'),
  }).pipe(Layer.provide(NodeHttpClient.layerUndici));

  const AnthropicLayer = AnthropicClient.layerConfig({
    apiKey: Config.redacted('ANTHROPIC_API_KEY'),
  }).pipe(Layer.provide(NodeHttpClient.layerUndici));

  it.runIf(process.env.OPENAI_API_KEY)('should make a tool call', async ({ expect }) => {
    const createProgram = (prompt: string) =>
      AiLanguageModel.generateText({
        toolkit: Toolkit,
        prompt,
      }).pipe(
        // Effect.tap((response) => Console.log(response)),
        Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
        Effect.retry(pipe(Schedule.exponential('1 second'), Schedule.intersect(Schedule.recurs(2)))),
        Effect.timeout('30 seconds'),
      );

    const program = createProgram('What is six times seven? Use appropriate tools and just answer with the number.');
    const result = await program.pipe(Effect.provide([toolkitLayer, OpenAiLayer]), Effect.runPromise);
    expect(result).toBeDefined();
  });

  const createChat = (prompt: string) =>
    Effect.gen(function* () {
      const chat = yield* AiChat.empty;
      const toolkit = yield* Toolkit;

      // Initial request.
      let response = yield* chat.generateText({ toolkit, prompt });

      // Agentic loop.
      while (response.results.size > 0) {
        response = yield* chat.generateText({ toolkit, prompt: AiInput.empty });
      }

      // Done.
      return response.text;
    });

  it.runIf(process.env.OPENAI_API_KEY)('should process an agentic loop using OpenAI', async ({ expect }) => {
    const chat = createChat('What is six times seven?');
    const result = await chat.pipe(
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.provide(OpenAiLayer),
      Effect.provide(toolkitLayer),
      Effect.runPromise,
    );

    log.info('result', { result });
    expect(result).toContain('42');
  });

  // TODO(burdon): Fix Anthropic.
  it.runIf(process.env.ANTHROPIC_API_KEY).skip('should process an agentic loop using Anthropic', async ({ expect }) => {
    const chat = createChat('What is six times seven?');
    const result = await chat.pipe(
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      Effect.provide(toolkitLayer),
      Effect.runPromise,
    );

    log.info('result', { result });
    expect(result).toContain('42');
  });
});
