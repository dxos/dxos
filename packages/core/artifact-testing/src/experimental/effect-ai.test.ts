//
// Copyright 2025 DXOS.org
//

import { TestHelpers } from '@dxos/effect';
import { AiChat, AiInput, AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { NodeHttpClient } from '@effect/platform-node';
import { describe, it } from '@effect/vitest';
import { Chunk, Config, Console, Effect, Layer, pipe, Schedule, Schema, Stream } from 'effect';

import { log } from '@dxos/log';
import { parseGptStream } from '@dxos/ai';

// https://effect.website/docs/ai/tool-use/#5-bring-it-all-together
// https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/CHANGELOG.md
// https://discord.com/channels/795981131316985866/1338871274398679130

// TODO(burdon): Implement MCP server for ECHO on CF.

// Providers.
const OpenAiLayer = OpenAiClient.layerConfig({
  apiKey: Config.redacted('OPENAI_API_KEY'),
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

const AnthropicLayer = AnthropicClient.layerConfig({
  apiKey: Config.redacted('ANTHROPIC_API_KEY'),
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

const createChat = Effect.fn(function* (prompt: string) {
  const chat = yield* AiChat.empty;
  const toolkit = yield* TestToolkit;

  // Initial request.
  // NOTE: Providing `toolkit` returns `AiRespose.WithToolCallResults`.
  let output = yield* chat.generateText({ toolkit, prompt });

  // Agentic loop.
  // TODO(burdon): Explain how this works?
  while (output.results.size > 0) {
    log.info('results', { results: output.results.size });
    output = yield* chat.generateText({ toolkit, prompt: AiInput.empty });
  }

  // Done.
  return output.text;
});

// Tool definitions.
class TestToolkit extends AiToolkit.make(
  AiTool.make('Calculator', {
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
) {}

// Tool handlers.
const toolkitLayer = TestToolkit.toLayer({
  Calculator: ({ input }) =>
    Effect.gen(function* () {
      const result = (() => {
        // Restrict to basic arithmetic operations for safety.
        const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
        log.info('calculate', { sanitizedInput });

        // eslint-disable-next-line no-new-func
        return Function(`"use strict"; return (${sanitizedInput})`)();
      })();

      // TODO(burdon): How to return an error.
      yield* Console.log(`Executing calculation: ${input} = ${result}`);
      return { result };
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
describe.runIf(!process.env.CI)('AiLanguageModel', () => {
  // Sanity test.
  it.effect(
    'Debug: Verify API configuration',
    Effect.fn(
      function* ({ expect }) {
        yield* Console.log('Testing API connectivity...');
        const { text } = yield* AiLanguageModel.generateText({ prompt: 'Hello, respond with "API is working"' });
        yield* Console.log('API Response received:', text);

        expect(text).to.contain('API is working');
      },
      Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
      Effect.timeout('10 seconds'),
      Effect.retry({ times: 1 }),
      Effect.provide(OpenAiLayer),
      TestHelpers.runIf(process.env.OPENAI_API_KEY),
    ),
  );

  it.effect(
    'should make a tool call',
    Effect.fn(
      function* ({ expect }) {
        const createProgram = (prompt: string) =>
          AiLanguageModel.generateText({
            toolkit: TestToolkit,
            prompt,
          }).pipe(
            // Effect.tap((response) => Console.log(response)),
            Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
            Effect.retry(pipe(Schedule.exponential('1 second'), Schedule.intersect(Schedule.recurs(2)))),
            Effect.timeout('30 seconds'),
          );

        const result = yield* createProgram(
          'What is six times seven? Use appropriate tools and just answer with the number.',
        );
        expect(result).toBeDefined();
      },
      Effect.provide([toolkitLayer, OpenAiLayer]),
      TestHelpers.runIf(process.env.OPENAI_API_KEY),
    ),
  );

  it.effect(
    'should process an agentic loop using OpenAI',
    Effect.fn(function* ({ expect }) {
      const chat = createChat('What is six times seven?');
      const result = yield* chat.pipe(
        Effect.provide(OpenAiLanguageModel.model('gpt-4o')),
        Effect.provide(OpenAiLayer),
        Effect.provide(toolkitLayer),
      );

      log.info('result', { result });
      expect(result).toContain('42');
    }, TestHelpers.runIf(process.env.OPENAI_API_KEY)),
  );

  it.effect(
    'should process an agentic loop using Claude',
    Effect.fn(function* ({ expect }) {
      const chat = createChat('What is six times seven?');
      const result = yield* chat.pipe(
        Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
        Effect.provide(AnthropicLayer),
        Effect.provide(toolkitLayer),
      );

      log.info('result', { result });
      expect(result).toContain('42');
    }, TestHelpers.runIf(process.env.ANTHROPIC_API_KEY)),
  );

  it.effect(
    'streaming',
    Effect.fn(
      function* ({ expect }) {
        const chat = yield* AiChat.empty;
        const toolkit = yield* TestToolkit;

        let prompt: AiInput.Raw = 'What is six times seven?';
        do {
          // disableToolCallResolution
          const stream = chat.streamText({ toolkit, prompt });
          prompt = AiInput.empty;

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
    ),
    { timeout: 120_000 },
  );

  it.effect.only(
    'with parser',
    Effect.fn(
      function* ({ expect }) {
        const system = `
          Before you answer I want you to emit your current status (what are you doing?) inside <status></status> XML tags.

          After your answer emit the suggestions for follow-up user prompts inside <suggest></suggest> XML tags.
        `;

        const chat = yield* AiChat.empty;
        const toolkit = yield* TestToolkit;

        let prompt: AiInput.Raw = `
        <instructions>
          ${system}
        </instructions>
        
        What is six times seven?`;
        do {
          // disableToolCallResolution
          const stream = chat.streamText({ system, prompt, toolkit }).pipe(parseGptStream());
          prompt = AiInput.empty;

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
    ),
    { timeout: 120_000 },
  );
});

// What's the right stopping condition?
const hasToolCall = Effect.fn(function* (chat: AiChat.AiChat.Service) {
  const history = yield* chat.history;
  return (
    history.messages.at(-1)?.parts.at(-1)?._tag === 'ToolCallPart' ||
    history.messages.at(-1)?.parts.at(-1)?._tag === 'ToolCallResultPart'
  );
});
