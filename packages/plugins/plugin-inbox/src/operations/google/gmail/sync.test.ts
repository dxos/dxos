//
// Copyright 2026 DXOS.org
//

import { format, subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../../../constants';
import { generateGmailDataset } from '../../../testing/gmail-fixtures';
import { inboxSyncTestServices, seedMailboxBinding } from '../../../testing/sync-fixture';
import { ThreadIndex } from '../../../types';

import { runGmailSync } from './sync';

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

  test('syncs generated messages into the feed with contacts, threads, tags, and cursor', { timeout: 30_000 }, async ({
    expect,
  }) => {
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
        const feedMessages = yield* Effect.promise(() =>
          db.queryFeed(mailbox.feed.target!, Filter.type(Message.Message)).run(),
        );
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

    // Thread index: the distinct thread ids among synced messages.
    const syncedThreadIds = new Set(feedMessages.map((message) => message.threadId).filter(Boolean));
    const threadIndex = mailbox.threads!.target!;
    expect(new Set(ThreadIndex.bind(threadIndex).threadIds())).toEqual(syncedThreadIds);

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
    const afterRerun = await db.queryFeed(mailbox.feed.target!, Filter.type(Message.Message)).run();
    expect(afterRerun.length).toBe(feedMessages.length);
    expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
  });

  test('initial backward, incremental forward, and backfill (cursor stays put)', { timeout: 30_000 }, async ({
    expect,
  }) => {
    const now = new Date();
    const day = (ago: number) => format(subDays(now, ago), 'yyyy-MM-dd');
    // Three disjoint date bands (distinct ids via idPrefix), oldest → newest: older, mid, recent.
    const mid = generateGmailDataset({ count: 10, seed: 1, start: subDays(now, 13), end: subDays(now, 8), idPrefix: 'mid' });
    const recent = generateGmailDataset({ count: 8, seed: 2, start: subDays(now, 5), end: subDays(now, 2), idPrefix: 'new' });
    const older = generateGmailDataset({ count: 6, seed: 3, start: subDays(now, 25), end: subDays(now, 20), idPrefix: 'old' });
    const union = (...datasets: (typeof mid)[]) => ({ labels: mid.labels, messages: datasets.flatMap((d) => d.messages) });
    const maxKey = (dataset: typeof mid) => Math.max(...dataset.messages.map((message) => Number(message.internalDate)));

    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    const cursorKey = () => Number.parseInt(binding.cursor.target?.value ?? '0', 10);
    const feedIds = async () => {
      const messages = await db.queryFeed(mailbox.feed.target!, Filter.type(Message.Message)).run();
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
});
