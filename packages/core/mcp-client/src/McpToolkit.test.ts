//
// Copyright 2026 DXOS.org
//

import * as Chat from '@effect/ai/Chat';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, type OpaqueToolkit } from '@dxos/ai';
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

describe('connectWithFallback', () => {
  test.skipIf(!process.env.LINEAR_API_KEY)(
    'connects to Linear MCP (SSE kind falls back to HTTP)',
    async () => {
      const toolkit = await Effect.runPromise(
        McpToolkit.make({
          url: 'https://mcp.linear.app/mcp',
          kind: 'sse',
          apiKey: process.env.LINEAR_API_KEY,
        }),
      );
      log.info('connected', { tools: Object.keys(toolkit.toolkit.tools).length });
    },
    { timeout: 30_000 },
  );
});

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
        let output: LanguageModel.GenerateTextResponse<OpaqueToolkit.OpaqueTools>;

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
        let output: LanguageModel.GenerateTextResponse<OpaqueToolkit.OpaqueTools>;

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
