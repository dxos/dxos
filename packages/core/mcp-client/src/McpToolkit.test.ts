import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { AiService, type GenericToolkit } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { TestHelpers } from '@dxos/effect/testing';
import * as McpToolkit from './McpToolkit';
import { Chat, LanguageModel, Prompt } from '@effect/ai';
import { log } from '@dxos/log';

const AiServiceLayer = AiService.model('@anthropic/claude-opus-4-6').pipe(
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
});
