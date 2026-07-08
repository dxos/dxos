//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type FactExtractor, messageSource } from '@dxos/pipeline-email';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';
import { DerivedBinding } from '@dxos/plugin-connector';
import { Cursor, Message } from '@dxos/types';

import { Mailbox } from '../../types';
import { runFactPipeline } from './enrich-mailbox';

const makeMessage = (suffix: string, created: string) =>
  Obj.make(Message.Message, {
    created,
    sender: { email: `test-${suffix}@example.com` },
    blocks: [{ _tag: 'text', text: `Message ${suffix}` }],
  });

const makeFact = (source: string, id: string, object = 'paris'): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: object },
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: {
    agent: 'alice',
    source,
    generatedAtTime: '2026-06-06T00:00:00.000Z',
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' },
  sourceHash: 'abc123',
});

// Deterministic extractor: one distinct fact per message keyed off its stable source id (no LLM).
const stubExtract: FactExtractor = (message) =>
  Promise.resolve([makeFact(messageSource(message), `fact-${message.id}`, `dest-${message.id}`)]);

describe('runFactPipeline', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('extracts facts into the store, advances the cursor, and skips already-processed messages on re-run', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed, Cursor.Cursor, DerivedBinding.DerivedBinding],
    });

    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    const messages = [makeMessage('1', '2026-06-01T00:00:00.000Z'), makeMessage('2', '2026-06-02T00:00:00.000Z')];
    await db.appendToFeed(feed, messages);
    const binding = DerivedBinding.make({ [Relation.Source]: feed, [Relation.Target]: mailbox });
    db.add(binding);
    await db.flush();

    const maxKey = Math.max(...messages.map((message) => Date.parse(message.created)));

    // Both runs share ONE provided Effect chain so the memoized FactStore instance is reused.
    const result = await Effect.gen(function* () {
      const first = yield* runFactPipeline({ feed, binding, extract: stubExtract, pageSize: 10 });
      const store = yield* FactStore;
      const storedFacts = yield* store.query({});
      const cursorAfterFirst = yield* Database.load(binding.cursor);
      const second = yield* runFactPipeline({ feed, binding, extract: stubExtract, pageSize: 10 });
      return { first, second, storedFacts, cursorValue: cursorAfterFirst.value };
    }).pipe(Effect.provide(Database.layer(db)), Effect.provide(FactStore.layerMemory), EffectEx.runAndForwardErrors);

    expect(result.first.processed).toBe(2);
    expect(result.first.facts).toBe(2);
    expect(result.storedFacts.length).toBe(2);
    expect(Cursor.parseKey(result.cursorValue)).toBe(maxKey);

    // Re-run in the same store/session: cursor resume + non-empty store skips every message.
    expect(result.second.processed).toBe(0);
  });
});
