//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';

import { AssistantTestLayer } from '../testing';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ToolExecutionServices),
  Layer.provideMerge(AssistantTestLayer({ tracing: 'noop' })),
);

describe('AiRequest xml response', () => {
  // End-to-end regression: drive a real (memoized) LLM call via `AiRequest` and inspect the
  // streamed blocks. Original bug: when the user prompted "respond with your name inside an
  // xml tag", the model emitted `<name>Claude</name>` as text, but `AiParser.makeContentBlock`
  // returned `undefined` for any unrecognized tag, silently dropping the entire response.
  // The chat UI then showed only the reasoning preamble. This test guards against future
  // regressions further down the parser/preprocessor path that might re-introduce the drop.
  it.effect(
    'response with xml tag emits a text block',
    Effect.fn(
      function* ({ expect }) {
        const request = new AiRequest();
        const messages = yield* request.run({
          prompt: 'Respond with your name inside an xml tag (use any tag name you like).',
          history: [],
        });

        const summary = messages.map((message) => ({
          role: message.sender.role,
          blocks: message.blocks.map((block) => ({
            tag: block._tag,
            preview: JSON.stringify(block).slice(0, 240),
          })),
        }));
        log.info('llm messages', { summary });

        const assistantBlocks = messages
          .filter((message) => message.sender.role === 'assistant')
          .flatMap((message) => message.blocks);

        const reasoningBlocks = assistantBlocks.filter((block) => block._tag === 'reasoning');
        const textBlocks = assistantBlocks.filter((block) => block._tag === 'text');
        log.info('block summary', { reasoning: reasoningBlocks.length, text: textBlocks.length });

        expect(textBlocks.length).toBeGreaterThan(0);

        const combined = textBlocks.map((block) => (block as any).text ?? '').join('\n');
        log.info('combined text', { combined });
        expect(combined).toMatch(/<\w+[^>]*>/);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
