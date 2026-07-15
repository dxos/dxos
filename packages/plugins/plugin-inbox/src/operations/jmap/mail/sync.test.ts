//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Operation, RunAgainError } from '@dxos/compute';
import { Blob, Database, Feed, Filter, Obj, Order, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Person } from '@dxos/types';

import { JMAP_MAIL_CONNECTOR_ID, JMAP_MESSAGE_SOURCE } from '../../../constants';
import { type JmapDataset, JmapMailApi } from '../../../services';
import { generateJmapDataset } from '../../../testing/jmap-fixtures';
import { ambientSyncServices, inboxJmapSyncTestServices, seedMailboxBinding } from '../../../testing/sync-fixture';
import { InboxOperation, Mailbox } from '../../../types';
import { runJmapSync } from './sync';

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

const maxKey = (dataset: JmapDataset) =>
  Math.max(...dataset.emails.map((email) => new Date(email.receivedAt).getTime()));
const minKey = (dataset: JmapDataset) =>
  Math.min(...dataset.emails.map((email) => new Date(email.receivedAt).getTime()));

/**
 * Wraps a mock {@link JmapMailApi} so `emailGet` dies after `n` successful calls — simulates a crash
 * mid-run so a test can assert the committed prefix is durable and a following run resumes correctly.
 */
const withFaultAfterEmails = (n: number, dataset: JmapDataset): Layer.Layer<JmapMailApi> =>
  Layer.effect(
    JmapMailApi,
    Effect.gen(function* () {
      const inner = yield* JmapMailApi;
      let count = 0;
      return JmapMailApi.of({
        ...inner,
        emailGet: (target, ids, properties) => {
          count += 1;
          return count > n ? Effect.die(new Error('injected fault')) : inner.emailGet(target, ids, properties);
        },
      });
    }),
  ).pipe(Layer.provide(JmapMailApi.mock(dataset)));

// The JMAP sync driven end-to-end against a real ECHO db + a mock JMAP API — no live account.
// `runJmapSync` requires `JmapMailApi` rather than providing the live HTTP client itself, so the
// whole pipeline — session, query, dedup, decode, map, contact/thread extraction, folder-tag
// application, commit, cursor advance — exercises against generated data.
describe('runJmapSync against a mock JMAP API', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  const seed = (options?: { high?: string; low?: string; options?: Record<string, unknown> }) =>
    seedMailboxBinding(builder, { source: JMAP_MESSAGE_SOURCE, connectorId: JMAP_MAIL_CONNECTOR_ID, ...options });
  const jmapKeyIds = (message: Message.Message) =>
    Obj.getMeta(message)
      .keys.filter((key) => key.source === JMAP_MESSAGE_SOURCE)
      .map((key) => key.id);
  const syncedIdsOf = async (db: Database.Database, mailbox: Mailbox.Mailbox) =>
    (await queryFeedMessages(db, mailbox)).flatMap(jmapKeyIds);

  test('syncs generated emails into the feed with contacts, threads, tags, and cursor', async ({ expect }) => {
    // A window comfortably inside the default 30-day sync horizon (and away from its day boundaries),
    // so the window walk covers the whole dataset regardless of the local timezone.
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateJmapDataset({ count: 40, seed: 11, start, end });

    const { db, mailbox, binding } = await seed();

    const { result, feedMessages } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const result = yield* runJmapSync({ binding: Ref.make(binding) });
        const feedMessages = yield* Effect.promise(() => queryFeedMessages(db, mailbox));
        return { result, feedMessages };
      }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );

    // The window walk fetched some emails; every synced message is a distinct dataset email.
    const datasetIds = new Set(dataset.emails.map((email) => email.id));
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

    // Folder tags: the folder→Tag sync materializes one Tag per JMAP folder (independent of the walk).
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    expect(tags.length).toBe(dataset.folders.length);

    // Cursor advanced to the last synced key; backfill completed within the run (small dataset).
    expect(binding.high).toBeDefined();
    expect(Number.parseInt(binding.high!, 10)).toBeGreaterThan(0);
    expect(binding.low).toBeDefined();

    // Re-running is a no-op: dedup + cursor prevent duplicate work.
    const rerun = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );
    expect(rerun.newMessages).toBe(0);
    const afterRerun = await queryFeedMessages(db, mailbox);
    expect(afterRerun.length).toBe(feedMessages.length);
    expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
  });

  test('initial backward, incremental forward, and widening syncBackDays reopens backfill', async ({ expect }) => {
    const now = new Date();
    // Three disjoint date bands (distinct ids via idPrefix), oldest → newest: older, mid, recent.
    const mid = generateJmapDataset({
      count: 10,
      seed: 1,
      start: subDays(now, 13),
      end: subDays(now, 8),
      idPrefix: 'mid',
    });
    const recent = generateJmapDataset({
      count: 8,
      seed: 2,
      start: subDays(now, 5),
      end: subDays(now, 2),
      idPrefix: 'new',
    });
    const older = generateJmapDataset({
      count: 6,
      seed: 3,
      start: subDays(now, 25),
      end: subDays(now, 20),
      idPrefix: 'old',
    });
    const union = (...datasets: (typeof mid)[]) => ({
      session: mid.session,
      folders: mid.folders,
      emails: datasets.flatMap((dataset) => dataset.emails),
    });

    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // 1) Initial: no cursor → backward from today down to the 14-day horizon. Only `mid` is in range.
    const r1 = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, mid))),
    );
    expect(r1.newMessages).toBe(mid.emails.length);
    expect(Number.parseInt(binding.high!, 10)).toBe(maxKey(mid)); // high set to the newest synced.
    const lowAfterInitial = Number.parseInt(binding.low!, 10);
    expect(lowAfterInitial).toBeLessThan(minKey(mid)); // backfill completed: low clamped to the horizon.

    // 2) Incremental: forward from `high`. A newer band has arrived; only it syncs, `low` unchanged.
    const r2 = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent))),
      ),
    );
    expect(r2.newMessages).toBe(recent.emails.length);
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
      runJmapSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent, older))),
      ),
    );
    expect(r3.newMessages).toBe(older.emails.length);
    expect(binding.high).toBe(highBeforeWiden);
    expect(Number.parseInt(binding.low!, 10)).toBeLessThan(minKey(older));

    // All three bands landed exactly once.
    const ids = await syncedIdsOf(db, mailbox);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(mid.emails.length + recent.emails.length + older.emails.length);
  });

  test('an interrupted initial sync commits durably and a following run resumes both halves', async ({ expect }) => {
    const now = new Date();
    const dataset = generateJmapDataset({ count: 20, seed: 23, start: subDays(now, 10), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // Fault after the first commit page (COMMIT_PAGE_SIZE = 10) — simulates a crash partway through
    // the initial backward (newest-first) walk.
    const exit = await EffectEx.runPromise(
      Effect.exit(runJmapSync({ binding: Ref.make(binding) })).pipe(
        Effect.provide(ambientSyncServices(db)),
        Effect.provide(withFaultAfterEmails(10, dataset)),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);

    // The committed page is durable and is a contiguous newest suffix of the dataset (backward walks
    // newest-first); `low` reflects the oldest committed key, `high` the newest — no completion (the
    // run errored, not merely exhausted).
    const committedAfterFault = await syncedIdsOf(db, mailbox);
    expect(committedAfterFault).toHaveLength(10);
    const sortedDesc = [...dataset.emails].sort(
      (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    );
    expect(new Set(committedAfterFault)).toEqual(new Set(sortedDesc.slice(0, 10).map((email) => email.id)));
    expect(Number.parseInt(binding.high!, 10)).toBe(maxKey(dataset));
    expect(Number.parseInt(binding.low!, 10)).toBe(new Date(sortedDesc[9].receivedAt).getTime());

    // Recovery: a healthy run resumes the backward half from `low` and picks up nothing new forward
    // (no new mail arrived) — everything lands exactly once.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );
    const finalIds = await syncedIdsOf(db, mailbox);
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toHaveLength(dataset.emails.length);
    expect(Number.parseInt(binding.low!, 10)).toBeLessThan(minKey(dataset));
  });

  test('a capped run requests Operation.runAgain(), and repeated runs sync the whole mailbox', async ({ expect }) => {
    const now = new Date();
    const dataset = generateJmapDataset({ count: 30, seed: 29, start: subDays(now, 5), end: subDays(now, 1) });
    const { db, mailbox, binding } = await seed();

    const runOnce = () =>
      EffectEx.runPromise(
        Effect.exit(runJmapSync({ binding: Ref.make(binding), maxMessages: 10 })).pipe(
          Effect.provide(inboxJmapSyncTestServices(db, dataset)),
        ),
      );

    // What must hold every run: never a duplicate, never fewer messages than before, a `RunAgainError`
    // exit exactly while capped, and eventual completion with the whole mailbox landed exactly once.
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
    expect(finalIds).toHaveLength(dataset.emails.length);
  });

  test(
    'the newest message is not re-committed across backfill runs once it ages out of the dedup seed — ' +
      'regression: the forward high-boundary re-fetch duplicated it every run',
    async ({ expect }) => {
      const now = new Date();
      const dataset = generateJmapDataset({ count: 30, seed: 31, start: subDays(now, 5), end: subDays(now, 1) });
      const { db, mailbox, binding } = await seed();

      // `dedupSeedTail` (5) < the number of messages backfilled after the newest one, so a newest-only
      // seed would drop the newest message from the dedup set on later runs and the forward
      // `after: high` re-fetch would re-commit it — the production case with >500 backfilled messages.
      const runOnce = () =>
        EffectEx.runPromise(
          Effect.exit(runJmapSync({ binding: Ref.make(binding), maxMessages: 10, dedupSeedTail: 5 })).pipe(
            Effect.provide(inboxJmapSyncTestServices(db, dataset)),
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
      expect(finalIds).toHaveLength(dataset.emails.length);
    },
  );

  test("backward keeps JMAP's newest-first order and forward reverses to oldest-first", async ({ expect }) => {
    // Small enough to land in one page (QUERY_PAGE_SIZE = 50), so feed insertion order directly
    // reflects the query order.
    const end = subDays(new Date(), 3);
    const dataset = generateJmapDataset({ count: 4, seed: 7, start: subDays(end, 2), end });

    // No cursor → backward (initial sync): newest-first.
    const backward = await seed();
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(backward.binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(backward.db, dataset)),
      ),
    );
    const backwardOrder = await insertionOrderTimestamps(backward.db, backward.mailbox);
    expect(backwardOrder).toEqual([...backwardOrder].sort((left, right) => right - left));

    // Forward (incremental resume): seed a cursor just below the dataset, with `syncBackDays` short
    // enough that the horizon sits above `low` — so only the forward window is active. Oldest-first,
    // so a run capped by `maxMessages` advances `high` gap-free instead of jumping to the newest key
    // and stranding the older, unprocessed middle.
    const forwardCursor = String(minKey(dataset) - 1);
    const forward = await seed({ high: forwardCursor, low: forwardCursor, options: { syncBackDays: 1 } });
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(forward.binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(forward.db, dataset)),
      ),
    );
    const forwardOrder = await insertionOrderTimestamps(forward.db, forward.mailbox);
    expect(forwardOrder).toEqual([...forwardOrder].sort((left, right) => left - right));
  });

  test('attachments land as Blobs on the feed with resolvable attachment refs', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const base = generateJmapDataset({ count: 1, seed: 5, start: subDays(end, 1), end });
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const dataset = {
      session: { ...base.session, downloadUrl: 'https://jmap.test/download/{accountId}/{blobId}/{name}?type={type}' },
      folders: base.folders,
      emails: [{ ...base.emails[0], attachments: [{ blobId: 'blob-1', name: 'photo.png', type: 'image/png' }] }],
      blobs: { 'blob-1': bytes },
    };

    const { db, mailbox, binding } = await seed();
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
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
  });

  test('JmapSync is marked idempotent for durable-execution retry', ({ expect }) => {
    expect(Operation.isIdempotent(InboxOperation.JmapSync)).toBe(true);
  });
});
