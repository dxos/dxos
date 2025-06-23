//
// Copyright 2025 DXOS.org
//

import { AiChat, AiInput, AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { NodeHttpClient, NodeRuntime } from '@effect/platform-node';
import { Config, Console, Effect, Layer, pipe, Schedule, Schema } from 'effect';
import { describe, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

// https://effect.website/docs/ai/tool-use/#5-bring-it-all-together
// https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/CHANGELOG.md
// https://discord.com/channels/795981131316985866/1338871274398679130

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
  const ToolkitLayer = Tools.toLayer({
    Calculator: ({ input }) =>
      Effect.gen(function* () {
        yield* Console.log(`Executing calculation: ${input}`);
        return { result: 42 };
      }),
  });

  // Provider.
  const OpenAiLayer = OpenAiClient.layerConfig({
    apiKey: Config.redacted('OPENAI_API_KEY'),
  }).pipe(Layer.provide(NodeHttpClient.layerUndici));

  it.only('should make a tool call', async ({ expect }) => {
    const createProgram = (prompt: string) =>
      AiLanguageModel.generateText({
        toolkit: Tools,
        prompt,
      }).pipe(
        Effect.tap((response) => Console.log(`Response: ${response.text}`)),
        Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
        Effect.retry(pipe(Schedule.exponential('1 second'), Schedule.intersect(Schedule.recurs(2)))),
        Effect.timeout('30 seconds'),
      );

    const program = createProgram('What is six times seven? Use appropriate tools and just answer with the number.');
    const result = await program.pipe(Effect.provide([ToolkitLayer, OpenAiLayer]), Effect.runPromise);
    expect(result).toBeDefined();
  });

  // TODO(burdon): What is the effectful way to do this?
  // TODO(burdon): Factor out model and OpenAiLayer.
  const chat = async (prompt: string) => {
    const trigger = new Trigger<string>();

    Effect.gen(function* () {
      const model = yield* OpenAiLanguageModel.model('gpt-4o');
      const chat = yield* AiChat.empty.pipe(Effect.provide(model));
      const tools = yield* Tools;

      // Initial request.
      let response = yield* chat.generateText({
        toolkit: tools,
        prompt,
      });

      // Agentic loop.
      while (response.results.size > 0) {
        response = yield* chat.generateText({
          toolkit: tools,
          prompt: AiInput.empty,
        });
      }

      // Done.
      trigger.wake(response.text);
    }).pipe(Effect.provide([ToolkitLayer, OpenAiLayer]), NodeRuntime.runMain);

    return trigger.wait();
  };

  it.only('should process an agentic loop', async ({ expect }) => {
    const result = await chat('What is six times seven?');
    log.info('result', { result });
    expect(result).toContain('42');
  });

  // TODO(burdon): Implement MCP server for ECHO on CF.
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
