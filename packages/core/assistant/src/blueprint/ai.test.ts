// Copyright 2025 DXOS.org
//

import { AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { NodeHttpClient } from '@effect/platform-node';
import { Config, Console, Effect, Layer, pipe, Schedule, Schema } from 'effect';
import { describe, it } from 'vitest';

import { log } from '@dxos/log';

// https://effect.website/docs/ai/tool-use/#5-bring-it-all-together

/**
 * Rationale:
 * - Separation of concerns: config, execution pipline, error handling/retry, tool dispatch, async.
 * - Uncouple tool definitions from tool implementation (late binding, composition).
 * - Affinity with effect schema.
 * - Leverage existing effect based conductor pipline.
 * - Simple API for plugins/artifacts.
 * - Ecosystem and design partner.
 */
describe.runIf(process.env.OPENAI_API_KEY)('AiLanguageModel', () => {
  it.only('Debug: Verify API configuration', async ({ expect }) => {
    const program = Effect.gen(function* () {
      yield* Console.log('Testing API connectivity...');
      const response = yield* AiLanguageModel.generateText({ prompt: 'Hello, respond with "API is working"' });
      yield* Console.log('API Response received:', response.text);
      return response.text;
    }).pipe(
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.timeout('10 seconds'),
      Effect.retry({ times: 1 }),
    );

    const result = await program.pipe(
      Effect.provide([
        OpenAiClient.layerConfig({
          apiKey: Config.redacted('OPENAI_API_KEY'),
        }).pipe(Layer.provide(NodeHttpClient.layerUndici)),
      ]),
      Effect.runPromise,
    );

    expect(result).to.contain('working');
  });

  // Tool definitions.
  class Tools extends AiToolkit.make(
    AiTool.make('Calculator', {
      description: 'Test tool',
      parameters: {
        calculation: Schema.String.annotations({
          description: 'The calculation to perform.',
        }),
      },
      success: Schema.String,
      failure: Schema.Never,
    }),
  ) {}

  // Tool handlers.
  const ToolHandlers = Tools.toLayer({
    Calculator: ({ calculation }) =>
      Effect.gen(function* () {
        yield* Console.log(`Executing calculation: ${calculation}`);
        return '42';
      }),
  });

  const createProgram = (prompt: string) =>
    AiLanguageModel.generateText({
      toolkit: Tools,
      prompt,
    }).pipe(
      Effect.tap((response) => Console.log(`Response: ${response.text}`)),
      Effect.map((response) => response.text),
      // TODO(burdon): Factor out model.
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.retry(pipe(Schedule.exponential('1 second'), Schedule.intersect(Schedule.recurs(2)))),
      Effect.timeout('30 seconds'),
    );

  it.only('OpenAI tool call', async ({ expect }) => {
    const program = createProgram('What is six times seven? Use appropriate tools and just answer with the number.');
    const result = await program.pipe(
      // TODO(burdon): Factor out layers.
      Effect.provide([
        ToolHandlers,
        OpenAiClient.layerConfig({
          apiKey: Config.redacted('OPENAI_API_KEY'),
        }).pipe(Layer.provide(NodeHttpClient.layerUndici)),
      ]),
      Effect.runPromise,
    );

    log.info('result', { result });
    expect(result).toContain('42');
  });

  // TODO(burdon): MCP tool call.
  // TODO(burdon): Test function call with Anthropic.

  // it.skip('Anthropic tool call', async ({ expect }) => {
  //   const program = AiLanguageModel.generateText({
  //     toolkit: Tools,
  //     prompt: 'What is six times seven?',
  //   }).pipe(
  //     Effect.map((response) => response.text),
  //     Effect.provide(AnthropicLanguageModel.model('claude-3-7-sonnet-latest')),
  //   );

  //   const result = await program.pipe(
  //     Effect.provide([
  //       ToolHandlers,
  //       AnthropicClient.layerConfig({
  //         apiKey: Config.redacted('ANTHROPIC_API_KEY'),
  //       }).pipe(Layer.provide(NodeHttpClient.layerUndici)),
  //     ]),
  //     Effect.runPromise,
  //   );
  //   console.log({ result });
  //   expect(result).toBeDefined();
  // });
});
