//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { subDays } from 'date-fns';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { createProgressRegistry } from '@dxos/app-toolkit';
import { Operation, RunAgainError } from '@dxos/compute';
import { Blob, Database, Feed, Filter, Obj, Order, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../../../../constants';
import { type GmailDataset, GoogleMailApi } from '../../../../services';
import { generateGmailDataset } from '../../../../testing/gmail-fixtures';
import { ambientSyncServices, inboxSyncTestServices, seedMailboxBinding } from '../../../../testing/sync-fixture';
import { InboxOperation, Mailbox } from '../../../../types';
import { createSyncProgressKey, syncGmail } from './sync';

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

/** Distinct Gmail message ids synced into the feed so far. */
const syncedIdsOf = async (db: Database.Database, mailbox: Mailbox.Mailbox) => {
  const messages = await queryFeedMessages(db, mailbox);
  return messages.flatMap((message) =>
    Obj.getMeta(message)
      .keys.filter((key) => key.source === GMAIL_SOURCE)
      .map((key) => key.id),
  );
};

const maxKey = (dataset: GmailDataset) => Math.max(...dataset.messages.map((message) => Number(message.internalDate)));
const minKey = (dataset: GmailDataset) => Math.min(...dataset.messages.map((message) => Number(message.internalDate)));

/**
 * Wraps a mock {@link GoogleMailApi} so `getMessage` dies after `n` successful calls — simulates a
 * crash mid-run (e.g. a process kill) so a test can assert the committed prefix is durable and a
 * following run resumes correctly.
 */
const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Layer<GoogleMailApi> =>
  Layer.effect(
    GoogleMailApi,
    Effect.gen(function* () {
      const inner = yield* GoogleMailApi;
      let count = 0;
      return GoogleMailApi.of({
        ...inner,
        getMessage: (userId, messageId) => {
          count += 1;
          return count > n ? Effect.die(new Error('injected fault')) : inner.getMessage(userId, messageId);
        },
      });
    }),
  ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));

/** Wraps a mock {@link GoogleMailApi} recording every `getMessage` id, so a test can assert which full
 *  messages were actually downloaded (vs skipped as already-synced before the fetch). */
const countingGmailApi = (dataset: GmailDataset): { layer: Layer.Layer<GoogleMailApi>; fetched: string[] } => {
  const fetched: string[] = [];
  const layer = Layer.effect(
    GoogleMailApi,
    Effect.gen(function* () {
      const inner = yield* GoogleMailApi;
      return GoogleMailApi.of({
        ...inner,
        getMessage: (userId, messageId) => {
          fetched.push(messageId);
          return inner.getMessage(userId, messageId);
        },
      });
    }),
  ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));
  return { layer, fetched };
};

// The Gmail sync driven end-to-end against a real ECHO db + a mock Gmail API — no live account.
// `syncGmail` requires `GoogleMailApi` rather than providing the live HTTP client itself, so the
// whole pipeline — fetch, dedup, decode, map, contact/thread extraction, tag application, commit,
// cursor advance — exercises against generated data.
describe('syncGmail against a mock Gmail API', () => {
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

    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const { result, feedMessages } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const result = yield* syncGmail({ binding: Ref.make(binding) });
        const feedMessages = yield* Effect.promise(() => queryFeedMessages(db, mailbox));
        return { result, feedMessages };
      }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    // The date-walk fetched some messages; every synced message is a distinct dataset message.
    const datasetIds = new Set(dataset.messages.map((message) => message.id));
    const syncedIds = await syncedIdsOf(db, mailbox);
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

    // Cursor advanced to the last synced key; backfill completed within the run (small dataset).
    expect(binding.high).toBeDefined();
    expect(Number.parseInt(binding.high!, 10)).toBeGreaterThan(0);
    expect(binding.low).toBeDefined();

    // Re-running is a no-op: dedup + cursor prevent duplicate work.
    const rerun = await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    expect(rerun.newMessages).toBe(0);
    const afterRerun = await queryFeedMessages(db, mailbox);
    expect(afterRerun.length).toBe(feedMessages.length);
    expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
  });

  test('a re-run does not re-download already-synced messages (id-level dedup before fetch)', async ({ expect }) => {
    // Pinned clock so the re-run's forward window lands on the same high-water day as the first sync.
    const now = new Date('2026-07-16T12:00:00.000Z');
    const dataset = generateGmailDataset({ count: 12, seed: 55, start: subDays(now, 6), end: subDays(now, 1) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // Initial full sync.
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    expect((await syncedIdsOf(db, mailbox)).length).toBe(dataset.messages.length);

    // Re-run with a counting API. The forward window still *lists* the high-water day's ids, but they
    // are all already committed, so `skipCommitted` drops them before `getMessage` — nothing downloads.
    const { layer, fetched } = countingGmailApi(dataset);
    const rerun = await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(Layer.mergeAll(layer, ambientSyncServices(db))),
      ),
    );
    expect(rerun.newMessages).toBe(0);
    expect(fetched).toEqual([]);
  });

  test('advances a live progress monitor keyed by the mailbox URI, and removes it on success', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateGmailDataset({ count: 20, seed: 17, start, end });

    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    // The monitor is removed on success, so the final snapshot can't show it — subscribe instead to
    // capture `current` as the run advances it, one message at a time.
    const seen: number[] = [];
    const unsubscribe = registry.subscribe(progress.snapshotAtom, (snapshot) => {
      const task = snapshot.tasks.find((task) => task.name === createSyncProgressKey(mailbox));
      if (task) {
        seen.push(task.current);
      }
    });

    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxSyncTestServices(db, dataset, { progressRegistry: progress })),
      ),
    );
    unsubscribe();

    expect(seen.length).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBeGreaterThan(0);
    // Removed on success, so the mailbox's task is gone from the final snapshot.
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
  });

  test('cancelling mid-sync clears the monitor instead of leaving it stuck running', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateGmailDataset({ count: 30, seed: 29, start, end });

    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const key = createSyncProgressKey(mailbox);

    // Cancel as soon as the monitor shows real progress, so the run is genuinely mid-flight — the
    // subscription fires synchronously from the same `advance` call, so this reliably races ahead of
    // completion rather than after it.
    let cancelled = false;
    const unsubscribe = registry.subscribe(progress.snapshotAtom, (snapshot) => {
      const task = snapshot.tasks.find((task) => task.name === key);
      if (task && task.current > 0 && !cancelled) {
        cancelled = true;
        progress.cancel(key);
      }
    });

    // Cancelling aborts the pipeline, which resolves as a fiber interrupt (`Pipeline.abortWith`) — not
    // a typed failure — so `runPromise` rejects. The cleanup runs via that abort's `onCancel`, not the
    // post-run code (the interrupt skips it), so the monitor is still removed.
    await expect(
      EffectEx.runPromise(
        syncGmail({ binding: Ref.make(binding) }).pipe(
          Effect.provide(inboxSyncTestServices(db, dataset, { progressRegistry: progress })),
        ),
      ),
    ).rejects.toThrow();
    unsubscribe();

    expect(cancelled).toBe(true);
    // Not stuck at 'running' — the abort-path cleanup removes the monitor just like the success path,
    // instead of leaving it frozen at its last snapshot forever.
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
  });

  test('initial backward, incremental forward, and widening syncBackDays reopens backfill', async ({ expect }) => {
    const now = new Date();
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

    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // 1) Initial: no cursor → backward from today down to the 14-day horizon. Only `mid` is in range.
    const r1 = await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, mid))),
    );
    expect(r1.newMessages).toBe(mid.messages.length);
    expect(Number.parseInt(binding.high!, 10)).toBe(maxKey(mid)); // high set to the newest synced.
    const lowAfterInitial = Number.parseInt(binding.low!, 10);
    expect(lowAfterInitial).toBeLessThan(minKey(mid)); // backfill completed: low clamped to the horizon.

    // 2) Incremental: forward from `high`. A newer band has arrived; only it syncs, `low` unchanged.
    const r2 = await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, union(mid, recent)))),
    );
    expect(r2.newMessages).toBe(recent.messages.length);
    expect(Number.parseInt(binding.high!, 10)).toBe(maxKey(recent));
    expect(Number.parseInt(binding.low!, 10)).toBe(lowAfterInitial);

    // 3) Widen syncBackDays to 30 — the horizon moves below `low`, reopening backward. `older` is in
    // range; `high` stays put (older keys don't exceed it).
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.options = { ...(binding.spec.options ?? {}), syncBackDays: 30 };
      }
    });
    const highBeforeWiden = binding.high;
    const r3 = await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxSyncTestServices(db, union(mid, recent, older))),
      ),
    );
    expect(r3.newMessages).toBe(older.messages.length);
    expect(binding.high).toBe(highBeforeWiden);
    expect(Number.parseInt(binding.low!, 10)).toBeLessThan(minKey(older));

    // All three bands landed exactly once.
    const ids = await syncedIdsOf(db, mailbox);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(mid.messages.length + recent.messages.length + older.messages.length);
  });

  test('an interrupted initial sync commits durably and a following run resumes both halves', async ({ expect }) => {
    const now = new Date();
    const dataset = generateGmailDataset({ count: 20, seed: 23, start: subDays(now, 10), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // Fault after the first commit page (GMAIL_SYNC_CONFIG.commitPageSize = 10) — simulates a crash partway
    // through the initial backward (newest-first) walk.
    const exit = await EffectEx.runPromise(
      Effect.exit(syncGmail({ binding: Ref.make(binding) })).pipe(
        Effect.provide(ambientSyncServices(db)),
        Effect.provide(withFaultAfterMessages(10, dataset)),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable and is a contiguous newest suffix of the dataset (backward walks
    // newest-first); `low` reflects the oldest committed key, `high` the newest — no completion (the
    // run errored, not merely exhausted).
    const committedAfterFault = await syncedIdsOf(db, mailbox);
    expect(committedAfterFault).toHaveLength(10);
    const sortedDesc = [...dataset.messages].sort(
      (left, right) => Number(right.internalDate) - Number(left.internalDate),
    );
    expect(new Set(committedAfterFault)).toEqual(new Set(sortedDesc.slice(0, 10).map((message) => message.id)));
    expect(Number.parseInt(binding.high!, 10)).toBe(maxKey(dataset));
    expect(Number.parseInt(binding.low!, 10)).toBe(Number(sortedDesc[9].internalDate));

    // Recovery: a healthy run resumes the backward half from `low` and picks up nothing new forward
    // (no new mail arrived) — everything lands exactly once.
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    const finalIds = await syncedIdsOf(db, mailbox);
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toHaveLength(dataset.messages.length);
    expect(Number.parseInt(binding.low!, 10)).toBeLessThan(minKey(dataset));
  });

  test('a capped run requests Operation.runAgain(), and repeated runs sync the whole mailbox', async ({ expect }) => {
    const now = new Date();
    const dataset = generateGmailDataset({ count: 25, seed: 29, start: subDays(now, 5), end: subDays(now, 1) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const runOnce = () =>
      EffectEx.runPromise(
        Effect.exit(syncGmail({ binding: Ref.make(binding), maxMessages: 10 })).pipe(
          Effect.provide(inboxSyncTestServices(db, dataset)),
        ),
      );

    // Each run commits up to `maxMessages` genuinely-new messages (the cap is applied post-dedup), and
    // re-runs until both windows are exhausted. Invariants every run: never a duplicate, never fewer
    // than before, a `RunAgainError` exit exactly while capped, and eventual completion exactly once.
    let previousCount = 0;
    let runs = 0;
    let exit: Exit.Exit<unknown, unknown>;
    do {
      exit = await runOnce();
      runs += 1;
      const ids = await syncedIdsOf(db, mailbox);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(previousCount);
      previousCount = ids.length;
      if (Exit.isFailure(exit)) {
        expect(RunAgainError.is(Cause.squash(exit.cause))).toBe(true);
      }
    } while (Exit.isFailure(exit) && runs < 10);

    expect(Exit.isSuccess(exit)).toBe(true);
    const finalIds = await syncedIdsOf(db, mailbox);
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toHaveLength(dataset.messages.length);
  });

  test(
    'capped runs make progress even when a boundary day holds more already-synced messages than the cap — ' +
      'regression: the day-granular boundary re-fetch consumed the whole budget and stalled the cursor',
    async ({ expect }) => {
      // Pinned clock so the day boundaries are fixed (the stall depends on how the dataset's days line
      // up with the cap). A dataset spread across several days within the horizon; with `maxMessages`
      // smaller than a single day's message count, every capped run re-enumerates the boundary day's
      // already-synced messages (newest-first) — before the fix, that consumed the entire per-run
      // budget on dedup-dropped re-fetches, so `low` never advanced and the oldest messages were never
      // reached (permanent loss / infinite re-run).
      const now = new Date('2026-07-16T12:00:00.000Z');
      const dataset = generateGmailDataset({ count: 25, seed: 29, start: subDays(now, 5), end: subDays(now, 1) });
      const { db, mailbox, binding } = await seedMailboxBinding(builder);

      let runs = 0;
      let exit: Exit.Exit<unknown, unknown>;
      do {
        exit = await EffectEx.runPromise(
          Effect.exit(syncGmail({ binding: Ref.make(binding), maxMessages: 5, now })).pipe(
            Effect.provide(inboxSyncTestServices(db, dataset)),
          ),
        );
        runs += 1;
        expect(new Set(await syncedIdsOf(db, mailbox)).size).toBe((await syncedIdsOf(db, mailbox)).length);
      } while (Exit.isFailure(exit) && runs < 20);

      expect(Exit.isSuccess(exit)).toBe(true);
      const finalIds = await syncedIdsOf(db, mailbox);
      expect(new Set(finalIds).size).toBe(finalIds.length);
      expect(finalIds).toHaveLength(dataset.messages.length);
    },
  );

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

    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
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

    // No cursor → backward (initial sync): Gmail's native newest-first order should be preserved.
    const backward = await seedMailboxBinding(builder);
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(backward.binding) }).pipe(
        Effect.provide(inboxSyncTestServices(backward.db, dataset)),
      ),
    );
    const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
    expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

    // Forward (incremental resume): seed a cursor just below the dataset, with `syncBackDays` short
    // enough that the horizon sits above `low` — so only the forward window is active. Within-chunk
    // order reverses to oldest-first, matching the chunk-level walk direction.
    const forwardCursor = String(minKey(dataset) - 1);
    const forward = await seedMailboxBinding(builder, {
      high: forwardCursor,
      low: forwardCursor,
      options: { syncBackDays: 1 },
    });
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(forward.binding) }).pipe(
        Effect.provide(inboxSyncTestServices(forward.db, dataset)),
      ),
    );
    const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
  });

  test('a chunk spanning multiple Gmail listMessages pages orders (and advances the cursor) across the whole chunk, not per page', async ({
    expect,
  }) => {
    // More than one Gmail `listMessages` page (`GMAIL_SYNC_CONFIG.listPageSize` = 500) within a single
    // date chunk (`dateChunkDays` = 7): reversing page-by-page would only be locally oldest-first
    // within each 500-message page, not globally across the chunk — this is the regression this test
    // guards against.
    const end = subDays(new Date(), 3);
    const dataset = generateGmailDataset({ count: 510, seed: 13, start: subDays(end, 2), end });

    // Backward (initial sync): Gmail's native newest-first order is never reversed, so it's already
    // globally consistent across pages — asserted here as a regression guard alongside forward.
    const backward = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(backward.binding), maxMessages: 1000 }).pipe(
        Effect.provide(inboxSyncTestServices(backward.db, dataset)),
      ),
    );
    const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
    expect(backwardOrder).toHaveLength(510);
    expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

    // Forward (incremental resume): must be oldest-first across the *entire* chunk (both pages), not
    // just within each page. Seed a cursor below the dataset with a short horizon so only forward runs.
    const forwardCursor = String(minKey(dataset) - 1);
    const forward = await seedMailboxBinding(builder, {
      high: forwardCursor,
      low: forwardCursor,
      options: { syncBackDays: 1 },
    });
    await EffectEx.runPromise(
      syncGmail({ binding: Ref.make(forward.binding), maxMessages: 1000 }).pipe(
        Effect.provide(inboxSyncTestServices(forward.db, dataset)),
      ),
    );
    const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
    expect(forwardOrder).toHaveLength(510);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
    // Two full 510-message syncs (backward + forward) — well over the default 15s budget on slower CI runners.
  }, 30_000);

  test('GoogleMailSync is marked idempotent for durable-execution retry', ({ expect }) => {
    expect(Operation.isIdempotent(InboxOperation.GoogleMailSync)).toBe(true);
  });
});
