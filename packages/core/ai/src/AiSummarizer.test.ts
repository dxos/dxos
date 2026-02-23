import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { summarize } from './AiSummarizer';
import { TestAiService, TestData } from './testing';
import { Message, type ContentBlock } from '@dxos/types';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as AiService from './AiService';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { dbg } from '@dxos/log';

ObjectId.dangerouslyDisableRandomness();

const TestLanguageModel = AiService.model('@anthropic/claude-sonnet-4-5').pipe(Layer.provide(TestAiService()));

describe('AiSummarizer', () => {
  it.effect(
    'summarizes an email order conversation',
    Effect.fnUntraced(
      function* (_) {
        const messages = yield* Effect.promise(() => TestData.internetOrderConversation());
        const summary = yield* summarize(messages);
        invariant(summary.blocks[0]._tag === 'summary');
      },
      Effect.provide(TestLanguageModel),
      TestHelpers.provideTestContext,
    ),
  );
});
