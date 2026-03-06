import { Chat, LanguageModel, Prompt } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Effect, Layer, Schema } from 'effect';

import { AiService, type GenericToolkit } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';

import * as McpToolkit from './McpToolkit';

const AiServiceLayer = AiService.model('@anthropic/claude-opus-4-6', { thinking: false }).pipe(
  Layer.provide(
    TestAiService({
      disableMemoization: true,
    }),
  ),
);

describe('Browser Automation', () => {
  it.effect(
    'smoke',
    Effect.fnUntraced(
      function* (_) {
        const browserAutomationToolkit = yield* McpToolkit.make({
          url: 'https://playwright-mcp-example.dxos.workers.dev/sse',
          kind: 'sse',
        });

        const chat = yield* Chat.empty;
        let prompt: Prompt.RawInput = 'Check that you are able to use the browser. Open https://example.com';
        let output: LanguageModel.GenerateTextResponse<GenericToolkit.GenericTools>;

        do {
          output = yield* chat
            .generateText({
              prompt,
              toolkit: browserAutomationToolkit.toolkit,
            })
            .pipe(Effect.provide(browserAutomationToolkit.layer));
          log.info('results', { text: output.text, toolCalls: output.toolCalls.map((_) => _.name) });
          prompt = Prompt.empty;
        } while (
          // Agentic loop.
          // TODO(burdon): Explain how this works?
          output.toolCalls.length > 0
        );
        log.info('chat', { chat: yield* chat.export });
      },
      Effect.provide(AiServiceLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'effect-blog',
    Effect.fnUntraced(
      function* (_) {
        const browserAutomationToolkit = yield* McpToolkit.make({
          url: 'https://playwright-mcp-example.dxos.workers.dev/sse',
          kind: 'sse',
        });

        const chat = yield* Chat.empty;
        let prompt: Prompt.RawInput =
          'Scrape effect blog at https://effect.website/blog and find the content of last 3 articles. Next prompt I will ask you generate structured representation.';
        let output: LanguageModel.GenerateTextResponse<GenericToolkit.GenericTools>;

        do {
          output = yield* chat
            .generateText({
              prompt,
              toolkit: browserAutomationToolkit.toolkit,
            })
            .pipe(Effect.provide(browserAutomationToolkit.layer));
          log.info('results', { text: output.text, toolCalls: output.toolCalls.map((_) => _.name) });
          prompt = Prompt.empty;
        } while (
          // Agentic loop.
          // TODO(burdon): Explain how this works?
          output.toolCalls.length > 0
        );
        log.info('chat', { chat: yield* chat.export });

        const result = yield* chat.generateObject({
          prompt: 'Extract blog articles and people associated with them.',
          schema: Schema.Struct({
            authors: Schema.Array(
              Schema.Struct({
                name: Schema.String,
                position: Schema.String,
                url: Schema.String,
              }),
            ),
            articles: Schema.Array(
              Schema.Struct({
                heading: Schema.String,
                content: Schema.String,
                url: Schema.String,
              }),
            ),
          }),
        });

        log.info('result', { result });
      },
      Effect.provide(AiServiceLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('llm'),
    ),
    { timeout: 120_000 },
  );
});
