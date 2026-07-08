//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message, Organization, Person } from '@dxos/types';

import { EmailFactPipeline } from './fact-pipeline';
import { type FactIndexer } from './stages';
import { Thread } from './types';

describe('email fact pipeline (facts-only assembly)', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('EmailFactPipeline.run: stats → extract-facts', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Person.Person, Organization.Organization, Thread],
    });

    const messages = [
      makeMessage('<m-1@enron.com>', 'alice@enron.com', 'Q2 report', 'I will send the Q2 report by Friday.'),
      makeMessage('<m-2@enron.com>', 'bob@enron.com', 'Q2 report', 'Thanks, looking forward to it.'),
    ];

    const indexed: Message.Message[] = [];
    const indexFacts: FactIndexer = async (message) => {
      indexed.push(message);
      return [] as RDF.Fact[];
    };

    const result = await EffectEx.runPromise(EmailFactPipeline.run(messages, { db, indexFacts }));

    // All messages flowed through the stream and were collected in order.
    expect(result.messages).toHaveLength(2);
    // stats tallied each message that flowed through.
    expect(result.stats.total).toBe(2);
    expect(result.stats.from.get('alice@enron.com')).toBe(1);
    expect(result.stats.from.get('bob@enron.com')).toBe(1);
    // extract-facts invoked the indexer once per message.
    expect(indexed).toHaveLength(2);
    expect(indexed.map((message) => message.properties?.messageId)).toEqual(['<m-1@enron.com>', '<m-2@enron.com>']);
    // Facts-only assembly omits summarize/extract-contacts/threads: `result` has no such keys
    // (enforced at compile time by `EmailFactPipelineResult`, which declares only `messages`/`stats`).
    expect(Object.keys(result).sort()).toEqual(['messages', 'stats']);
  });
});

const makeMessage = (messageId: string, email: string, subject: string, text: string): Message.Message =>
  Message.make({
    created: '2001-05-14T10:00:00.000Z',
    sender: { email },
    blocks: [{ _tag: 'text', text }],
    properties: { messageId, subject },
  });
