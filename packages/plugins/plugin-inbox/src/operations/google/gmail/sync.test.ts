//
// Copyright 2026 DXOS.org
//

import { format, subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Blob, Database, Feed, Filter, Obj, Order, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../../../constants';
import { generateGmailDataset } from '../../../testing/gmail-fixtures';
import { inboxSyncTestServices, seedMailboxBinding } from '../../../testing/sync-fixture';
import { Mailbox } from '../../../types';
import { runGmailSync } from './sync';

/** Reads all synced messages from a seeded mailbox's feed. */
const queryFeedMessages = (db: Database.Database, mailbox: Mailbox.Mailbox) =>
  db.query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(mailbox.feed.target!)!))).run();

/** Feed insertion order (oldest-inserted first) as message `created` timestamps. */
const insertionOrderTimestamps = async (db: Database.Database, mailbox: Mailbox.Mailbox) => {
  const feed = mailbox.feed.target!;
  const messages = await db
    .query(
      Query.select(Filter.type(Message.Message))
        .from(Scope.feed(Feed.getFeedUri(feed)!))
        .orderBy(Order.natural('asc')),
    )
    .run();
  return messages.map((message) => Date.parse(message.created));
};

// The Gmail sync driven end-to-end against a real ECHO db + a mock Gmail API — no live account.
// `runGmailSync` requires `GoogleMailApi` rather than providing the live HTTP client itself, so the
// whole pipeline — fetch, dedup, decode, map, contact/thread extraction, tag application, commit,
// cursor advance — exercises against generated data.
describe('runGmailSync against a mock Gmail API', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  test('syncs generated messages into the feed with contacts, threads, tags, and cursor', async ({ expect }) => {
    // A window comfortably inside the default 30-day sync horizon (and away from its day boundaries),
    // so the date-walk covers the whole dataset regardless of the local timezone.
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateGmailDataset({ count: 40, seed: 11, start, end });
    // Start the walk just before the data so it terminates quickly (not decades of empty windows).
    const after = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const { result, feedMessages } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const result = yield* runGmailSync({ binding: Ref.make(binding), after });
        const feedMessages = yield* Effect.promise(() => queryFeedMessages(db, mailbox));
        return { result, feedMessages };
      }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    // The date-walk fetched some messages; every synced message is a distinct dataset message.
    const datasetIds = new Set(dataset.messages.map((message) => message.id));
    const syncedIds = feedMessages.flatMap((message) =>
      Obj.getMeta(message)
        .keys.filter((key) => key.source === GMAIL_SOURCE)
        .map((key) => key.id),
    );
    expect(syncedIds.length).toBeGreaterThan(0);
    expect(new Set(syncedIds).size).toBe(syncedIds.length);
    expect(syncedIds.every((id) => datasetIds.has(id))).toBe(true);

    // `newMessages` is consistent with what landed in the feed.
    expect(result.newMessages).toBe(feedMessages.length);

    // Contacts: one Person per distinct sender among the messages that actually synced.
    const senderEmails = new Set(feedMessages.map((message) => message.sender?.email).filter(Boolean));
    const people = await db.query(Filter.type(Person.Person)).run();
    expect(people.length).toBe(senderEmails.size);

    // Labels: `syncLabels` materializes one Tag per Gmail label (independent of the date-walk).
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    expect(tags.length).toBe(dataset.labels.length);

    // Cursor advanced to the last synced key.
    const cursorValue = binding.cursor.target?.value;
    expect(cursorValue).toBeDefined();
    expect(Number.parseInt(cursorValue!, 10)).toBeGreaterThan(0);

    // Re-running is a no-op: dedup + cursor prevent duplicate work.
    const rerun = await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), after }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    expect(rerun.newMessages).toBe(0);
    const afterRerun = await queryFeedMessages(db, mailbox);
    expect(afterRerun.length).toBe(feedMessages.length);
    expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
  });

  test('initial backward, incremental forward, and backfill (cursor stays put)', async ({ expect }) => {
    const now = new Date();
    const day = (ago: number) => format(subDays(now, ago), 'yyyy-MM-dd');
    // Three disjoint date bands (distinct ids via idPrefix), oldest → newest: older, mid, recent.
    const mid = generateGmailDataset({
      count: 10,
      seed: 1,
      start: subDays(now, 13),
      end: subDays(now, 8),
      idPrefix: 'mid',
    });
    const recent = generateGmailDataset({
      count: 8,
      seed: 2,
      start: subDays(now, 5),
      end: subDays(now, 2),
      idPrefix: 'new',
    });
    const older = generateGmailDataset({
      count: 6,
      seed: 3,
      start: subDays(now, 25),
      end: subDays(now, 20),
      idPrefix: 'old',
    });
    const union = (...datasets: (typeof mid)[]) => ({
      labels: mid.labels,
      messages: datasets.flatMap((d) => d.messages),
    });
    const maxKey = (dataset: typeof mid) =>
      Math.max(...dataset.messages.map((message) => Number(message.internalDate)));

    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    const cursorKey = () => Number.parseInt(binding.cursor.target?.value ?? '0', 10);
    const feedIds = async () => {
      const messages = await queryFeedMessages(db, mailbox);
      return messages.flatMap((message) =>
        Obj.getMeta(message)
          .keys.filter((key) => key.source === GMAIL_SOURCE)
          .map((key) => key.id),
      );
    };

    // 1) Initial: no cursor → backward from today down to the horizon (after). Only `mid` is available.
    const r1 = await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), after: day(14) }).pipe(Effect.provide(inboxSyncTestServices(db, mid))),
    );
    expect(r1.newMessages).toBe(mid.messages.length);
    expect(cursorKey()).toBe(maxKey(mid)); // cursor set to the newest synced.

    // 2) Incremental: cursor present → forward from the cursor. A newer band has arrived; only it syncs.
    const r2 = await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), after: day(14) }).pipe(
        Effect.provide(inboxSyncTestServices(db, union(mid, recent))),
      ),
    );
    expect(r2.newMessages).toBe(recent.messages.length);
    expect(cursorKey()).toBe(maxKey(recent)); // cursor advanced to the newest.

    // 3) Backfill: explicit backward over an older window (below the cursor). Fills gaps; cursor unchanged.
    const cursorBeforeBackfill = cursorKey();
    const r3 = await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), direction: 'backward', before: day(14), after: day(30) }).pipe(
        Effect.provide(inboxSyncTestServices(db, union(mid, recent, older))),
      ),
    );
    expect(r3.newMessages).toBe(older.messages.length);
    expect(cursorKey()).toBe(cursorBeforeBackfill); // backfill does NOT move the monotonic cursor.

    // All three bands landed exactly once.
    const ids = await feedIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(mid.messages.length + recent.messages.length + older.messages.length);
  });

  test('attachments land as Blobs on the feed with resolvable attachment refs', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const message = generateGmailDataset({ count: 1, seed: 5, start: subDays(end, 1), end }).messages[0];
    // These bytes base64url-encode to `-__-` — deliberately chosen to contain both `-` and `_`, since
    // that's the exact character class a base64-only encode (e.g. bytes like [1,2,3,4]) never
    // exercises. A prior version decoded via `Buffer.from(data, 'base64url')`, which threw in the
    // browser `Buffer` polyfill regardless of content (the encoding name itself is unsupported there)
    // but happened to work in this Node-based test — this fixture's job is the follow-on byte-equality
    // assertion below, proving the `-`/`_` → `+`/`/` substitution in the fix is actually correct.
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    // The fixture generates a single-part message (body directly on `payload.body`); once `parts` is
    // present the mapper treats it as multipart, so the plaintext body must move into a part too.
    const withAttachment = {
      ...message,
      payload: {
        ...message.payload,
        body: undefined,
        parts: [
          { mimeType: 'text/plain', body: message.payload.body! },
          { mimeType: 'image/png', filename: 'photo.png', body: { size: bytes.byteLength, attachmentId: 'att-1' } },
        ],
      },
    };
    const dataset = {
      labels: [],
      messages: [withAttachment],
      attachments: { 'att-1': { size: bytes.byteLength, data: Buffer.from(bytes).toString('base64url') } },
    };
    const after = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), after }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    const feedMessages = await queryFeedMessages(db, mailbox);
    expect(feedMessages).toHaveLength(1);
    const [attachment] = feedMessages[0].attachments ?? [];
    if (!attachment) {
      throw new Error('expected an attachment');
    }
    expect(attachment.name).toBe('photo.png');

    const blobs = await db
      .query(Query.select(Filter.type(Blob.Blob)).from(Scope.feed(Feed.getFeedUri(mailbox.feed.target!)!)))
      .run();
    expect(blobs).toHaveLength(1);

    const loadedBlob = await attachment.ref.load();
    expect(loadedBlob.id).toEqual(blobs[0].id);
    if (!Obj.instanceOf(Blob.Blob, loadedBlob)) {
      throw new Error('expected the attachment ref to resolve to a Blob');
    }
    // Round-trips exactly — proves the base64url decode (including the `-`/`_` substitution) is correct.
    const loadedBytes = await Blob.read(loadedBlob).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
    expect(Array.from(loadedBytes)).toEqual(Array.from(bytes));
  });

  test("within a single chunk, backward keeps Gmail's newest-first order and forward reverses to oldest-first", async ({
    expect,
  }) => {
    // Small enough (4 messages, 2-day span) to land in one date chunk and one commit page, so feed
    // insertion order directly reflects `fetchMessagesForDateRange`'s within-chunk message order.
    const end = subDays(new Date(), 3);
    const dataset = generateGmailDataset({ count: 4, seed: 7, start: subDays(end, 2), end });
    const after = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    // No cursor → backward (initial sync): Gmail's native newest-first order should be preserved.
    const backward = await seedMailboxBinding(builder);
    await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(backward.binding), after }).pipe(
        Effect.provide(inboxSyncTestServices(backward.db, dataset)),
      ),
    );
    const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
    expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

    // Explicit forward (incremental resume): within-chunk order reverses to oldest-first, matching the
    // chunk-level walk direction.
    const forward = await seedMailboxBinding(builder);
    await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(forward.binding), after, direction: 'forward' }).pipe(
        Effect.provide(inboxSyncTestServices(forward.db, dataset)),
      ),
    );
    const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
  });

  test(
    'a chunk spanning multiple Gmail listMessages pages orders (and advances the cursor) across the whole chunk, not per page',
    async ({ expect }) => {
      // More than one Gmail `listMessages` page (`STREAMING_CONFIG.maxResults` = 500) within a single
      // date chunk (`dateChunkDays` = 7): reversing page-by-page would only be locally oldest-first
      // within each 500-message page, not globally across the chunk — this is the regression this test
      // guards against.
      const end = subDays(new Date(), 3);
      const dataset = generateGmailDataset({ count: 510, seed: 13, start: subDays(end, 2), end });
      const after = format(subDays(new Date(), 14), 'yyyy-MM-dd');

      // Backward (initial sync): Gmail's native newest-first order is never reversed, so it's already
      // globally consistent across pages — asserted here as a regression guard alongside forward.
      const backward = await seedMailboxBinding(builder);
      await EffectEx.runPromise(
        runGmailSync({ binding: Ref.make(backward.binding), after }).pipe(
          Effect.provide(inboxSyncTestServices(backward.db, dataset)),
        ),
      );
      const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
      expect(backwardOrder).toHaveLength(510);
      expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

      // Forward (incremental resume): must be oldest-first across the *entire* chunk (both pages), not
      // just within each page.
      const forward = await seedMailboxBinding(builder);
      await EffectEx.runPromise(
        runGmailSync({ binding: Ref.make(forward.binding), after, direction: 'forward' }).pipe(
          Effect.provide(inboxSyncTestServices(forward.db, dataset)),
        ),
      );
      const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
      expect(forwardOrder).toHaveLength(510);
      expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
    },
    30_000,
  );
});
