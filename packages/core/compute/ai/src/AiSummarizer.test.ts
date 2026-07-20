//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';

import * as AiService from './AiService';
import * as AiSummarizer from './AiSummarizer';
import { ScriptedAiService, TestData } from './testing';

// `AiSummarizer.summarize` issues a single non-streaming `generateText` call, so the response is
// scripted under the model's `generate` bucket rather than the (streaming-only) top-level `turns`.
const TestLanguageModel = AiService.model('com.anthropic.model.claude-sonnet-4-6.default').pipe(
  Layer.provideMerge(
    ScriptedAiService.layer({
      models: {
        sonnet: {
          generate: [
            ScriptedAiService.text(
              'Processed an email notification about a redirected parcel ready for pickup.\n\n' +
                'Action taken: found the existing order object matching the tracking number and updated its ' +
                'status and address to the temporary pickup point, and recorded the pickup code and deadline in ' +
                'notes.\n\n' +
                'Order details preserved: item description, price, order date, order id, tracking number, ' +
                'offer id, payment id, and delivery fee.',
            ),
          ],
        },
      },
    }),
  ),
);

describe('AiSummarizer', () => {
  it.effect(
    'summarizes an email order conversation',
    Effect.fnUntraced(
      function* (_) {
        const messages = yield* Effect.promise(() => TestData.internetOrderConversation());
        const summary = yield* AiSummarizer.summarize(messages);
        invariant(summary.blocks[0]._tag === 'summary');
      },
      Effect.provide(TestLanguageModel),
      TestHelpers.provideTestContext,
    ),
  );
});
