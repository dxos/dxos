//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import * as AiService from './AiService';
import { AiServiceTestingPreset } from './testing';
import { processMessages } from './testing';

describe('effect AI tool calls', () => {
  it.effect(
    'calculator',
    Effect.fn(
      function* ({ expect }) {
        const messages = yield* processMessages({
          messages: [
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
            }),
          ],
        });

        expect(messages.length).toBeGreaterThan(1);
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
  );

  const parts = ['`---`', '`+++`', '`@@`'];

  it.effect(
    'markdown',
    Effect.fn(
      function* ({ expect }) {
        const messages = yield* processMessages({
          system: trim`
            You are a helpful assistant.
            You are an assistant that edits text documents.
            When I give you a document and an editing request, you must return ONLY a unified diff (patch) that applies the requested changes.

            Rules:
            - Use standard unified diff format (${parts.join(', ')}) with context lines.
            - Do not output the full file, only the diff.
            - Do not include explanations or extra text outside the diff.

            Example:
            --- old.txt
            +++ new.txt
            @@ -1,3 +1,4 @@
            The quick brown fox
            -jumps over the dog.
            +jumps over the lazy dog.
            +It looks very happy.
          `,
          messages: [
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'Read the document test.md and fix spelling mistakes' }],
            }),
          ],
        });

        expect(messages.length).toBeGreaterThan(1);
      },
      Effect.provide(
        AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
          Layer.provideMerge(AiServiceTestingPreset('direct')),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
