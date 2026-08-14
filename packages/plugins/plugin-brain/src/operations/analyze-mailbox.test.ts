//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { type FactExtractor, messageSource, runFactPipeline } from '@dxos/pipeline-email';
import { FactStore, FactStoreLive, type RDF } from '@dxos/pipeline-rdf';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Message } from '@dxos/types';

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

  test('extracts facts into the store, advances the feed cursor, and skips already-processed messages on re-run', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed, Cursor.Cursor],
    });

    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    const messages = [makeMessage('1', '2026-06-01T00:00:00.000Z'), makeMessage('2', '2026-06-02T00:00:00.000Z')];
    await db.appendToFeed(feed, messages);
    await db.flush();

    const maxKey = Math.max(...messages.map((message) => Date.parse(message.created)));
    const cursor = db.add(Cursor.makeFeed({ source: mailbox.feed, target: Ref.make(mailbox) }));

    // Both runs share ONE provided Effect chain so the memoized FactStore instance is reused.
    const result = await Effect.gen(function* () {
      const first = yield* runFactPipeline({ feed, cursor, extract: stubExtract, pageSize: 10 });
      const store = yield* FactStore;
      const storedFacts = yield* store.query({});
      const second = yield* runFactPipeline({ feed, cursor, extract: stubExtract, pageSize: 10 });
      return { first, second, storedFacts, cursorValue: Cursor.parseKey(cursor.max) };
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStoreLive.layerMemory),
      EffectEx.runAndForwardErrors,
    );

    expect(result.first.processed).toBe(2);
    expect(result.first.facts).toBe(2);
    expect(result.storedFacts.length).toBe(2);
    expect(result.cursorValue).toBe(maxKey);

    // Re-run against the same store + cursor skips every message (cursor + source dedup).
    expect(result.second.processed).toBe(0);
  });

  test('processes every message of a newest-first feed (archive import order)', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed, Cursor.Cursor],
    });

    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    // Appended newest-first: without the ascending sort, the first commit advances the cursor past
    // the two older messages and the run ends at processed 1.
    await db.appendToFeed(feed, [
      makeMessage('3', '2026-06-03T00:00:00.000Z'),
      makeMessage('2', '2026-06-02T00:00:00.000Z'),
      makeMessage('1', '2026-06-01T00:00:00.000Z'),
    ]);
    await db.flush();

    const cursor = db.add(Cursor.makeFeed({ source: mailbox.feed, target: Ref.make(mailbox) }));
    const progress: { processed: number; facts: number; total: number }[] = [];
    const result = await runFactPipeline({
      feed,
      cursor,
      extract: stubExtract,
      pageSize: 1,
      onProgress: (update) => progress.push(update),
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStoreLive.layerMemory),
      EffectEx.runAndForwardErrors,
    );

    expect(result.processed).toBe(3);
    expect(Cursor.parseKey(cursor.max)).toBe(Date.parse('2026-06-03T00:00:00.000Z'));

    // Determinate progress: the exact pending count arrives with the first report (before any page),
    // and the final report converges on it.
    expect(progress[0]).toEqual({ processed: 0, facts: 0, total: 3 });
    expect(progress.at(-1)).toEqual({ processed: 3, facts: 3, total: 3 });
  });

  test('drops a malformed created timestamp instead of poisoning the cursor', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed, Cursor.Cursor],
    });

    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    // Without the finite filter, the NaN key would flow into the page's Math.max and persist 'NaN'.
    await db.appendToFeed(feed, [
      makeMessage('1', '2026-06-01T00:00:00.000Z'),
      makeMessage('bad', 'not-a-date'),
      makeMessage('2', '2026-06-02T00:00:00.000Z'),
    ]);
    await db.flush();

    const cursor = db.add(Cursor.makeFeed({ source: mailbox.feed, target: Ref.make(mailbox) }));
    const result = await runFactPipeline({ feed, cursor, extract: stubExtract, pageSize: 1 }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStoreLive.layerMemory),
      EffectEx.runAndForwardErrors,
    );

    expect(result.processed).toBe(2);
    expect(Cursor.parseKey(cursor.max)).toBe(Date.parse('2026-06-02T00:00:00.000Z'));
  });
});
