//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { CalculatorLayer, CalculatorToolkit } from '@dxos/ai/testing';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { dbg, log } from '@dxos/log';
import { ContentBlock } from '@dxos/types';

import { AssistantTestLayer } from '../testing';

/**
 * Exercises the full AiRequest tool-call loop against a local Ollama instance.
 *
 * Prerequisites:
 * - `ollama serve` running on `localhost:11434` with the `gpt-oss:20b` model pulled.
 *
 * Run with:
 * ```bash
 * DX_TEST_TAGS=llm pnpm --filter @dxos/functions-runtime exec vitest run session-ollama
 * ```
 */

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ToolExecutionServices),
  Layer.provideMerge(
    AssistantTestLayer({
      tracing: 'pretty',
      aiServicePreset: 'ollama',
      model: 'gpt-oss:20b',
      disableLlmMemoization: true,
    }),
  ),
  Layer.provideMerge(CalculatorLayer),
);

describe('AiRequest (ollama gpt-oss:20b)', () => {
  it.effect(
    'calculator tool-call loop',
    Effect.fn(
      function* ({ expect }) {
        const request = new AiRequest();
        const toolkit = yield* OpaqueToolkit.fromContext(CalculatorToolkit);

        const messages = yield* request.run({
          toolkit,
          prompt: 'What is six times seven? Use the Calculator tool and reply with only the number.',
          history: [],
        });

        dbg(messages);

        const toolCalls = messages.flatMap((m) => m.blocks).filter(ContentBlock.is('toolCall'));
        const toolResults = messages.flatMap((m) => m.blocks).filter(ContentBlock.is('toolResult'));

        log.info('request result', {
          messageCount: messages.length,
          toolCalls: toolCalls.length,
          toolResults: toolResults.length,
          requestToolCalls: request.toolCalls,
        });

        expect(toolCalls.length).toBeGreaterThan(0);
        expect(toolCalls.some((call) => call.name === 'Calculator')).toBe(true);
        expect(toolResults.length).toBeGreaterThan(0);
        expect(toolResults.some((result) => String(result.result).includes('42'))).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000, tags: ['llm'] },
  );
});
