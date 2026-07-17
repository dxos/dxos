//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Operation, RunAgainError, Trace } from '@dxos/compute';
import { Blob, Database, Feed, Filter, Obj, Order, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { GMAIL_SOURCE } from '../../../../constants';
import { type GmailDataset, GoogleMailApi } from '../../../../services';
import { generateGmailDataset } from '../../../../testing/gmail-fixtures';
import {
  ambientSyncServices,
  inboxSyncTestServices,
  runGoogleSync,
  seedMailboxBinding,
} from '../../../../testing/sync-fixture';
import { InboxOperation, Mailbox, SystemTags } from '../../../../types';
import { createSyncProgressKey } from '../../mail-sync';

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
 * Wraps a mock {@link GoogleMailApi} so `getMessage` dies after `n` calls — simulates a mid-run crash
 * so a test can assert the committed prefix is durable and a following run resumes.
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

/** Wraps a mock {@link GoogleMailApi} recording every `getMessage` id, so a test can assert which
 *  messages were downloaded (vs skipped as already-synced before fetch). */
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

// Gmail sync driven end-to-end against a real ECHO db + a mock Gmail API — no live account. The whole
// pipeline (fetch, dedup, decode, map, contact/thread extraction, tag application, commit, cursor
// advance) exercises against generated data.
describe('runGoogleSync against a mock Gmail API', () => {
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
        const result = yield* runGoogleSync({ binding: Ref.make(binding) });
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

    // Labels: system labels (INBOX/SENT/IMPORTANT) map onto shared canonical tags — UNREAD and other
    // unmapped system labels are dropped — and custom user labels become provider-scoped tags.
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const canonical = new Set(
      dataset.labels.flatMap((label) => {
        const id = SystemTags.GMAIL_SYSTEM_TAGS[label.id];
        return id ? [id] : [];
      }),
    );
    const customCount = dataset.labels.filter((label) => label.type === 'user').length;
    expect(tags.length).toBe(canonical.size + customCount);

    // Cursor advanced to the last synced key; backfill completed within the run (small dataset).
    expect(binding.max).toBeDefined();
    expect(Number.parseInt(binding.max!, 10)).toBeGreaterThan(0);
    expect(binding.min).toBeDefined();

    // Re-running is a no-op: dedup + cursor prevent duplicate work.
    const rerun = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
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
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    expect((await syncedIdsOf(db, mailbox)).length).toBe(dataset.messages.length);

    // Re-run with a counting API. The forward window still *lists* the high-water day's ids, but they
    // are all already committed, so `skipCommitted` drops them before `getMessage` — nothing downloads.
    const { layer, fetched } = countingGmailApi(dataset);
    const rerun = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(Layer.mergeAll(layer, ambientSyncServices(db))),
      ),
    );
    expect(rerun.newMessages).toBe(0);
    expect(fetched).toEqual([]);
  });

  test('emits trace status updates with advancing progress during sync', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateGmailDataset({ count: 20, seed: 17, start, end });

    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
    const traceLayer = Trace.testTraceService().pipe(
      Layer.provide(
        Layer.succeed(Trace.TraceSink, {
          write: (message) => {
            for (const event of Trace.flatten(message)) {
              if (Trace.isOfType(Trace.StatusUpdate, event)) {
                statusUpdates.push(event.data);
              }
            }
          },
        }),
      ),
    );

    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxSyncTestServices(db, dataset, { traceLayer })),
      ),
    );

    const progressCurrents = statusUpdates
      .map((update) => update.progress?.current)
      .filter((current): current is number => current !== undefined);
    expect(progressCurrents.length).toBeGreaterThan(0);
    expect(Math.max(...progressCurrents)).toBeGreaterThan(0);
    expect(statusUpdates.some((update) => update.progress?.total !== undefined && update.progress.total > 0)).toBe(
      true,
    );
    expect(statusUpdates.every((update) => update.progress?.key === createSyncProgressKey(mailbox))).toBe(true);
    expect(statusUpdates.some((update) => update.message === mailbox.name)).toBe(true);
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
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, mid))),
    );
    expect(r1.newMessages).toBe(mid.messages.length);
    expect(Number.parseInt(binding.max!, 10)).toBe(maxKey(mid)); // max set to the newest synced.
    const lowAfterInitial = Number.parseInt(binding.min!, 10);
    expect(lowAfterInitial).toBeLessThan(minKey(mid)); // backfill completed: min clamped to the horizon.

    // 2) Incremental: forward from `max`. A newer band has arrived; only it syncs, `min` unchanged.
    const r2 = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, union(mid, recent)))),
    );
    expect(r2.newMessages).toBe(recent.messages.length);
    expect(Number.parseInt(binding.max!, 10)).toBe(maxKey(recent));
    expect(Number.parseInt(binding.min!, 10)).toBe(lowAfterInitial);

    // 3) Widen syncBackDays to 30 — the horizon moves below `min`, reopening backward. `older` is in
    // range; `max` stays put (older keys don't exceed it).
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.options = { ...(binding.spec.options ?? {}), syncBackDays: 30 };
      }
    });
    const highBeforeWiden = binding.max;
    const r3 = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxSyncTestServices(db, union(mid, recent, older))),
      ),
    );
    expect(r3.newMessages).toBe(older.messages.length);
    expect(binding.max).toBe(highBeforeWiden);
    expect(Number.parseInt(binding.min!, 10)).toBeLessThan(minKey(older));

    // All three bands landed exactly once.
    const ids = await syncedIdsOf(db, mailbox);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(mid.messages.length + recent.messages.length + older.messages.length);
  });

  test('an interrupted initial sync commits durably and a following run resumes both halves', async ({ expect }) => {
    const now = new Date();
    const dataset = generateGmailDataset({ count: 20, seed: 23, start: subDays(now, 10), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // Fault after the first commit page (GOOGLE_SYNC_CONFIG.commitPageSize = 10) — simulates a crash partway
    // through the initial backward (newest-first) walk.
    const exit = await EffectEx.runPromise(
      Effect.exit(runGoogleSync({ binding: Ref.make(binding) })).pipe(
        Effect.provide(ambientSyncServices(db)),
        Effect.provide(withFaultAfterMessages(10, dataset)),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable, a contiguous newest suffix (backward walks newest-first); `min` is
    // the oldest committed key, `max` the newest — no completion (the run errored, not exhausted).
    const committedAfterFault = await syncedIdsOf(db, mailbox);
    expect(committedAfterFault).toHaveLength(10);
    const sortedDesc = [...dataset.messages].sort(
      (left, right) => Number(right.internalDate) - Number(left.internalDate),
    );
    expect(new Set(committedAfterFault)).toEqual(new Set(sortedDesc.slice(0, 10).map((message) => message.id)));
    expect(Number.parseInt(binding.max!, 10)).toBe(maxKey(dataset));
    expect(Number.parseInt(binding.min!, 10)).toBe(Number(sortedDesc[9].internalDate));

    // Recovery: a healthy run resumes the backward half from `min` and picks up nothing new forward
    // (no new mail arrived) — everything lands exactly once.
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );
    const finalIds = await syncedIdsOf(db, mailbox);
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toHaveLength(dataset.messages.length);
    expect(Number.parseInt(binding.min!, 10)).toBeLessThan(minKey(dataset));
  });

  test('a capped run requests Operation.runAgain(), and repeated runs sync the whole mailbox', async ({ expect }) => {
    const now = new Date();
    const dataset = generateGmailDataset({ count: 25, seed: 29, start: subDays(now, 5), end: subDays(now, 1) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    const runOnce = () =>
      EffectEx.runPromise(
        Effect.exit(runGoogleSync({ binding: Ref.make(binding), maxMessages: 10 })).pipe(
          Effect.provide(inboxSyncTestServices(db, dataset)),
        ),
      );

    // Each run commits up to `maxMessages` new messages (cap applied post-dedup), re-running until both
    // windows are exhausted. Invariants: never a duplicate, never fewer than before, a `RunAgainError`
    // exit exactly while capped, eventual completion once.
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
      // Pinned clock so day boundaries are fixed. With `maxMessages` smaller than a single day's count,
      // every capped run re-enumerates the boundary day's already-synced messages — before the fix that
      // consumed the whole per-run budget on dedup-dropped re-fetches, so `min` never advanced and the
      // oldest messages were never reached (permanent loss / infinite re-run).
      const now = new Date('2026-07-16T12:00:00.000Z');
      const dataset = generateGmailDataset({ count: 25, seed: 29, start: subDays(now, 5), end: subDays(now, 1) });
      const { db, mailbox, binding } = await seedMailboxBinding(builder);

      let runs = 0;
      let exit: Exit.Exit<unknown, unknown>;
      do {
        exit = await EffectEx.runPromise(
          Effect.exit(runGoogleSync({ binding: Ref.make(binding), maxMessages: 5, now })).pipe(
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

  test(
    'the newest message is not re-committed across backfill runs once it ages out of the dedup seed — ' +
      'regression: the forward high-boundary re-fetch duplicated it every run',
    async ({ expect }) => {
      // Pinned clock: Gmail's queries are day-granular, so an unpinned `now` shifts the day boundaries
      // with wall-clock time and can strand a boundary-day message under this small a cap — pin it (like
      // the boundary-day test above) so the multi-run backfill is deterministic.
      const now = new Date('2026-07-16T12:00:00.000Z');
      const dataset = generateGmailDataset({ count: 30, seed: 31, start: subDays(now, 5), end: subDays(now, 1) });
      const { db, mailbox, binding } = await seedMailboxBinding(builder);

      // `dedupSeedTail` (5) < messages backfilled after the newest, so a newest-only seed would evict the
      // newest from the dedup set and the forward high-boundary-day re-fetch would re-commit it (prod: >500).
      const runOnce = () =>
        EffectEx.runPromise(
          Effect.exit(runGoogleSync({ binding: Ref.make(binding), maxMessages: 10, dedupSeedTail: 5, now })).pipe(
            Effect.provide(inboxSyncTestServices(db, dataset)),
          ),
        );

      let runs = 0;
      let exit: Exit.Exit<unknown, unknown>;
      do {
        exit = await runOnce();
        runs += 1;
        const ids = await syncedIdsOf(db, mailbox);
        // The invariant the bug violated: never a duplicate, on any run.
        expect(new Set(ids).size).toBe(ids.length);
      } while (Exit.isFailure(exit) && runs < 10);

      expect(Exit.isSuccess(exit)).toBe(true);
      const finalIds = await syncedIdsOf(db, mailbox);
      expect(new Set(finalIds).size).toBe(finalIds.length);
      expect(finalIds).toHaveLength(dataset.messages.length);
    },
  );

  test('attachments land as Blobs on the feed with resolvable attachment refs', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const message = generateGmailDataset({ count: 1, seed: 5, start: subDays(end, 1), end }).messages[0];
    // These bytes base64url-encode to `-__-` — deliberately containing both `-` and `_`, the character
    // class a base64-only encode never exercises, so the byte-equality assertion below proves the
    // `-`/`_` → `+`/`/` substitution is correct.
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
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
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
      runGoogleSync({ binding: Ref.make(backward.binding) }).pipe(
        Effect.provide(inboxSyncTestServices(backward.db, dataset)),
      ),
    );
    const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
    expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

    // Forward (incremental resume): seed a cursor just below the dataset, with `syncBackDays` short
    // enough that the horizon sits above `min` — so only the forward window is active. Within-chunk
    // order reverses to oldest-first, matching the chunk-level walk direction.
    const forwardCursor = String(minKey(dataset) - 1);
    const forward = await seedMailboxBinding(builder, {
      max: forwardCursor,
      min: forwardCursor,
      options: { syncBackDays: 1 },
    });
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(forward.binding) }).pipe(
        Effect.provide(inboxSyncTestServices(forward.db, dataset)),
      ),
    );
    const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
  });

  test('a chunk spanning multiple Gmail listMessages pages orders (and advances the cursor) across the whole chunk, not per page', async ({
    expect,
  }) => {
    // More than one `listMessages` page (`GOOGLE_SYNC_CONFIG.listPageSize` = 500) within one date chunk
    // (`dateChunkDays` = 7): reversing page-by-page would be oldest-first only within each page, not
    // across the chunk — the regression this test guards against.
    const end = subDays(new Date(), 3);
    const dataset = generateGmailDataset({ count: 510, seed: 13, start: subDays(end, 2), end });

    // Backward (initial sync): Gmail's native newest-first order is never reversed, so it's already
    // globally consistent across pages — asserted here as a regression guard alongside forward.
    const backward = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(backward.binding), maxMessages: 1000 }).pipe(
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
      max: forwardCursor,
      min: forwardCursor,
      options: { syncBackDays: 1 },
    });
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(forward.binding), maxMessages: 1000 }).pipe(
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

  //
  // Incremental (history.list) sync.
  //

  const tokenOf = (binding: Cursor.Cursor): string | undefined =>
    binding.spec.kind === 'external' ? binding.spec.token : undefined;

  test('the first tick captures the mailbox historyId (before backfill)', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = { ...generateGmailDataset({ count: 6, seed: 81, start, end }), historyId: '1000' };
    const { db, mailbox, binding } = await seedMailboxBinding(builder);

    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    expect(tokenOf(binding)).toBe('1000');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(dataset.messages.length);
  });

  test('an incremental run syncs only the delta added messages and advances the token', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 5, seed: 82, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // First tick: window backfill + capture '1000'.
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxSyncTestServices(db, { ...base, historyId: '1000' })),
      ),
    );
    expect(tokenOf(binding)).toBe('1000');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(base.messages.length);

    // A new message arrives; the history log advances 1000 → 1001 with it added.
    const arrival = generateGmailDataset({ count: 1, seed: 83, start: subDays(now, 1), end: now, idPrefix: 'new' })
      .messages[0];
    const run2 = {
      ...base,
      messages: [...base.messages, arrival],
      historyId: '1001',
      historyLog: [{ startHistoryId: '1000', historyId: '1001', messagesAdded: [arrival.id] }],
    };
    const r2 = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, run2))),
    );

    expect(r2.newMessages).toBe(1);
    expect(tokenOf(binding)).toBe('1001');
    const ids = await syncedIdsOf(db, mailbox);
    expect(ids).toContain(arrival.id);
    expect(ids.length).toBe(base.messages.length + 1);
  });

  test('a label-change delta larger than the per-run budget reconciles across bounded runs', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 5, seed: 85, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // First tick: window backfill + capture '1000'.
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxSyncTestServices(db, { ...base, historyId: '1000' })),
      ),
    );
    expect(tokenOf(binding)).toBe('1000');

    // Four label-change steps — the 'Work' label (Label_1) added to four already-synced messages —
    // chained 1000 → 1004. With a per-run budget of 2 records, the reconcile drains across bounded runs
    // (`hasMoreDelta` → runAgain), advancing the token to each chunk's last record id; no single run holds
    // the whole delta, and each run resolves only its chunk's messages (targeted foreign-key lookup).
    const targets = base.messages.slice(0, 4).map((message) => message.id);
    const dataset = {
      ...base,
      historyId: '1004',
      historyLog: targets.map((id, index) => ({
        startHistoryId: String(1000 + index),
        historyId: String(1001 + index),
        labelsAdded: [{ id, labelIds: ['Label_1'] }],
      })),
    };

    let runs = 0;
    let exit: Exit.Exit<unknown, unknown>;
    do {
      exit = await EffectEx.runPromise(
        Effect.exit(runGoogleSync({ binding: Ref.make(binding), maxMessages: 2, now })).pipe(
          Effect.provide(inboxSyncTestServices(db, dataset)),
        ),
      );
      runs += 1;
      if (Exit.isFailure(exit)) {
        expect(RunAgainError.is(Cause.squash(exit.cause))).toBe(true);
      }
    } while (Exit.isFailure(exit) && runs < 10);

    // Bounded: the 4-record delta took more than one run, and the token reached the mailbox's current id.
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(runs).toBeGreaterThan(1);
    expect(tokenOf(binding)).toBe('1004');

    // Reconcile-only: no new feed messages, and every target gained the Label_1 tag.
    expect((await syncedIdsOf(db, mailbox)).length).toBe(base.messages.length);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const feedMessages = await queryFeedMessages(db, mailbox);
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const label1Uri = Obj.getURI(
      tags.find((tag) => Obj.getMeta(tag).keys.some((key) => key.id === 'Label_1'))!,
    ).toString();
    for (const id of targets) {
      const target = feedMessages.find((message) =>
        Obj.getMeta(message).keys.some((key) => key.id === id && key.source === GMAIL_SOURCE),
      )!;
      expect(TagIndex.bind(tagIndex).tags(target.id)).toContain(label1Uri);
    }
  });

  test('a stale historyId clears it, falls back to the window scan, and recaptures', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 5, seed: 84, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // A prior run left a historyId the server can no longer resolve (evicted past retention → 404).
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.token = '1';
      }
    });

    const dataset = { ...base, historyId: '9999', historyLog: [] };
    const result = await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    expect(result.newMessages).toBe(base.messages.length);
    expect(tokenOf(binding)).toBe('9999');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(base.messages.length);
  });

  test('a crash mid-incremental leaves the token unadvanced and recovers with no duplicate', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 5, seed: 85, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });

    // First tick: backfill + capture '1000'.
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxSyncTestServices(db, { ...base, historyId: '1000' })),
      ),
    );
    expect(tokenOf(binding)).toBe('1000');

    // A large delta arrives; fault after the first commit page (10) lands.
    const arrivals = generateGmailDataset({
      count: 15,
      seed: 86,
      start: subDays(now, 1),
      end: now,
      idPrefix: 'new',
    }).messages;
    const run2Dataset = {
      ...base,
      messages: [...base.messages, ...arrivals],
      historyId: '1001',
      historyLog: [{ startHistoryId: '1000', historyId: '1001', messagesAdded: arrivals.map((message) => message.id) }],
    };
    const exit = await EffectEx.runPromise(
      Effect.exit(runGoogleSync({ binding: Ref.make(binding), now })).pipe(
        Effect.provide(ambientSyncServices(db)),
        Effect.provide(withFaultAfterMessages(10, run2Dataset)),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    // Token NOT advanced — a crash before the delta fully drained keeps it at '1000'.
    expect(tokenOf(binding)).toBe('1000');

    // Recovery: the next run re-fetches the whole delta, dedups the committed prefix, finishes clean.
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, run2Dataset))),
    );
    expect(tokenOf(binding)).toBe('1001');
    const ids = await syncedIdsOf(db, mailbox);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(base.messages.length + arrivals.length);
  });

  test('an incremental label add retags an existing message with no new feed append', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 3, seed: 90, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxSyncTestServices(db, { ...base, historyId: '2000' })),
      ),
    );
    const before = (await syncedIdsOf(db, mailbox)).length;
    const targetId = base.messages[0].id;

    // Delta: the 'Work' label (Label_1) was added to the target message on the server.
    const run2 = {
      ...base,
      historyId: '2001',
      historyLog: [
        { startHistoryId: '2000', historyId: '2001', labelsAdded: [{ id: targetId, labelIds: ['Label_1'] }] },
      ],
    };
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, run2))),
    );

    // No new feed message — the retag is an objectless commit unit — and the token advanced.
    expect((await syncedIdsOf(db, mailbox)).length).toBe(before);
    expect(tokenOf(binding)).toBe('2001');

    // The target message's EntityId gained the Label_1 Tag in the mailbox tag index.
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const feedMessages = await queryFeedMessages(db, mailbox);
    const target = feedMessages.find((message) =>
      Obj.getMeta(message).keys.some((key) => key.id === targetId && key.source === GMAIL_SOURCE),
    )!;
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const label1 = tags.find((tag) => Obj.getMeta(tag).keys.some((key) => key.id === 'Label_1'))!;
    expect(TagIndex.bind(tagIndex).tags(target.id)).toContain(Obj.getURI(label1).toString());
  });

  test('system labels resolve to canonical DXOS tags, not provider-scoped ones', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateGmailDataset({ count: 3, seed: 92, start: subDays(now, 6), end: subDays(now, 2) });
    const targetId = base.messages[0].id;
    // Star + Promotions on the target, and add both system labels to the dictionary.
    const dataset: GmailDataset = {
      ...base,
      labels: [
        ...base.labels,
        { id: 'STARRED', type: 'system', name: 'STARRED' },
        { id: 'CATEGORY_PROMOTIONS', type: 'system', name: 'CATEGORY_PROMOTIONS' },
      ],
      messages: base.messages.map((message) =>
        message.id === targetId
          ? { ...message, labelIds: [...(message.labelIds ?? []), 'STARRED', 'CATEGORY_PROMOTIONS'] }
          : message,
      ),
    };
    const { db, mailbox, binding } = await seedMailboxBinding(builder, { options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxSyncTestServices(db, dataset))),
    );

    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const feedMessages = await queryFeedMessages(db, mailbox);
    const target = feedMessages.find((message) =>
      Obj.getMeta(message).keys.some((key) => key.id === targetId && key.source === GMAIL_SOURCE),
    )!;
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const canonicalUri = (id: string) =>
      Obj.getURI(
        tags.find((tag) =>
          Obj.getMeta(tag).keys.some((key) => key.source === SystemTags.SYSTEM_TAG_SOURCE && key.id === id),
        )!,
      ).toString();

    // STARRED and CATEGORY_PROMOTIONS land on the canonical `org.dxos.tag` tags.
    const localTags = TagIndex.bind(tagIndex).tags(target.id);
    expect(localTags).toContain(canonicalUri('starred'));
    expect(localTags).toContain(canonicalUri('promotions'));
    // No provider-scoped tag was minted for the system labels.
    expect(
      tags.some((tag) =>
        Obj.getMeta(tag).keys.some(
          (key) =>
            key.source === Mailbox.GMAIL_TAG_SOURCE && (key.id === 'STARRED' || key.id === 'CATEGORY_PROMOTIONS'),
        ),
      ),
    ).toBe(false);
  });
});
