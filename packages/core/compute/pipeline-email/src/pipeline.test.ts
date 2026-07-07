//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type RDF } from '@dxos/pipeline-rdf';
import { mockAiService } from '@dxos/pipeline-rdf/testing';
import { Message, Organization, Person } from '@dxos/types';

import { EmailPipeline } from './pipeline';
import { type FactIndexer } from './stages';
import { Thread } from './types';

// `mockAiService`'s `generateText` always answers `''` (only `generateObject` echoes the payload), so
// summarize degrades to its empty-summary default and extract-contacts derives no LLM contacts here;
// this asserts the assembly WIRING (messages flow, stats tally, threads group) over a real ECHO db.
// Summary/contact/fact CONTENT is covered by the stage-specific suites.

describe('email pipeline (canonical assembly)', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('EmailPipeline.run: summarize → extract-contacts → stats → extract-facts → threads', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Person.Person, Organization.Organization, Thread],
    });

    const messages = [
      makeMessage('<m-1@enron.com>', 'alice@enron.com', 'Q2 report', 'I will send the Q2 report by Friday.'),
      makeMessage('<m-2@enron.com>', 'bob@enron.com', 'Q2 report', 'Thanks, looking forward to it.'),
    ];

    // Fact persistence is proven by stages/extract-facts.test.ts; here the indexer is a no-op.
    const indexFacts: FactIndexer = async () => [] as RDF.Fact[];

    const result = await EffectEx.runPromise(
      EmailPipeline.run(messages, {
        db,
        indexFacts,
        ownerEmail: 'alice@enron.com',
        now: '2001-05-20T10:00:00.000Z',
      }).pipe(Effect.provide(mockAiService({}))),
    );

    // All messages flowed through the stream and were collected in order.
    expect(result.messages).toHaveLength(2);
    // stats tallied each message that flowed through.
    expect(result.stats.total).toBe(2);
    expect(result.stats.from.get('alice@enron.com')).toBe(1);
    expect(result.stats.from.get('bob@enron.com')).toBe(1);
    // summarize recorded a result per message (content empty: see note above).
    expect(result.summaries).toHaveLength(2);
    // Both messages share a subject/thread, so they group into a single thread persisted to the db.
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].messageIds).toHaveLength(2);
  });
});

const makeMessage = (messageId: string, email: string, subject: string, text: string): Message.Message =>
  Message.make({
    created: '2001-05-14T10:00:00.000Z',
    sender: { email },
    blocks: [{ _tag: 'text', text }],
    properties: { messageId, subject },
  });
