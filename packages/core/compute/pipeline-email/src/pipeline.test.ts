//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { mockAiService } from '@dxos/pipeline-rdf/testing';
import { captureSink } from '@dxos/pipeline/testing';
import { Message } from '@dxos/types';

import {
  EmailPipelineCtx,
  type FactIndexer,
  type Summary,
  emptyStats,
  extractFactsStage,
  statsStage,
  summarizeStage,
} from './stages';

// `mockAiService`'s `generateText` always answers `''` (only `generateObject` echoes the given
// payload), so the summarize stage degrades to its empty-summary default here; summary *content* is
// covered by summarize-specific fixtures, not this assembly test.

describe('email pipeline (canonical assembly)', () => {
  test('summarize + extract-facts + stats over a stream of messages', async ({ expect }) => {
    const stats = emptyStats();
    const summaries: Array<{ messageId: string; summary: Summary }> = [];
    // Stage under test never touches `db`; extract-contacts (which does) is intentionally not
    // assembled here — it needs a real ECHO database, exercised instead by the gated
    // testing/email-pipeline.test.ts suite.
    const ctx = { db: {} as any, stats, summaries };

    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'alice@enron.com' },
      blocks: [{ _tag: 'text', text: 'I will send the Q2 report by Friday.' }],
      properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
    });

    const indexFacts: FactIndexer = async () => []; // Fact persistence is proven by stages/extract-facts.test.ts.

    const { sink, items } = captureSink<Message.Message>();
    await EffectEx.runPromise(
      Stream.fromIterable([message]).pipe(
        summarizeStage,
        extractFactsStage(indexFacts),
        statsStage,
        Pipeline.run({ sink }),
        Effect.provideService(EmailPipelineCtx, ctx),
        Effect.provide(mockAiService({})),
      ),
    );

    expect(items).toHaveLength(1);
    // stats tallies the message that flowed through summarize + extract-facts.
    expect(stats.total).toBe(1);
    expect(stats.from.get('alice@enron.com')).toBe(1);
    // summarize recorded a result keyed by messageId (content is empty: see note above).
    expect(summaries).toHaveLength(1);
    expect(summaries[0].messageId).toBe('<m-1@enron.com>');
  });
});
