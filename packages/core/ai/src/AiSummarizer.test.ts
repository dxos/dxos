//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';

import * as AiService from './AiService';
import { summarize } from './AiSummarizer';
import { TestAiService, TestData } from './testing';

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
