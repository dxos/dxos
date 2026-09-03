//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import * as AiSummarizer from './AiSummarizer.ts';
import { ScriptedLanguageModel } from './testing/index.ts';

EntityId.dangerouslyDisableRandomness();

const SUMMARY = 'The user ordered a laptop stand; the order shipped on the 3rd.';

// Scripting the model keeps the assertion on what `summarize` does with the response — the memoized
// version could only check that a summary block existed.
const TestLanguageModel = ScriptedLanguageModel.scriptedLanguageModelLayer([
  { parts: [ScriptedLanguageModel.text(SUMMARY)] },
]);

describe('AiSummarizer', () => {
  it.effect(
    'wraps the model response in an assistant summary message',
    Effect.fnUntraced(
      function* (_) {
        const summary = yield* AiSummarizer.summarize([
          message('user', 'Where is my order for the laptop stand?'),
          message('assistant', 'It shipped on the 3rd.'),
        ]);

        expect(summary.sender.role).toBe('assistant');
        expect(summary.blocks).toHaveLength(1);
        expect(summary.blocks[0]).toMatchObject({ _tag: 'summary', content: SUMMARY });
      },
      Effect.provide(TestLanguageModel),
      TestHelpers.provideTestContext,
    ),
  );
});

const message = (role: 'user' | 'assistant', text: string) =>
  Obj.make(Message.Message, {
    created: new Date(0).toISOString(),
    sender: { role },
    blocks: [{ _tag: 'text', text }],
  });
