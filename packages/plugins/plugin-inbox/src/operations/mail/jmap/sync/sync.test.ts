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
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { JMAP_MAIL_CONNECTOR_ID, JMAP_MESSAGE_SOURCE } from '../../../../constants';
import { type JmapDataset, JmapMailApi } from '../../../../services';
import { generateJmapDataset } from '../../../../testing/jmap-fixtures';
import {
  ambientSyncServices,
  inboxJmapSyncTestServices,
  runJmapSync,
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

const maxKey = (dataset: JmapDataset) =>
  Math.max(...dataset.emails.map((email) => new Date(email.receivedAt).getTime()));
const minKey = (dataset: JmapDataset) =>
  Math.min(...dataset.emails.map((email) => new Date(email.receivedAt).getTime()));

/**
 * Wraps a mock {@link JmapMailApi} so `emailGet` dies after `n` calls — simulates a mid-run crash to
 * assert the committed prefix is durable and a following run resumes.
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
          // The empty-ids call is the first-tick state-token capture, not a message fetch — don't count
          // it toward the injected fetch fault.
          if (ids.length === 0) {
            return inner.emailGet(target, ids, properties);
          }
          count += 1;
          return count > n ? Effect.die(new Error('injected fault')) : inner.emailGet(target, ids, properties);
        },
      });
    }),
  ).pipe(Layer.provide(JmapMailApi.mock(dataset)));

/** Wraps a mock {@link JmapMailApi} recording every `emailGet` id, so a test can assert which emails
 *  were downloaded (vs skipped as already-synced before fetch). */
const countingJmapApi = (dataset: JmapDataset): { layer: Layer.Layer<JmapMailApi>; fetched: string[] } => {
  const fetched: string[] = [];
  const layer = Layer.effect(
    JmapMailApi,
    Effect.gen(function* () {
      const inner = yield* JmapMailApi;
      return JmapMailApi.of({
        ...inner,
        emailGet: (target, ids, properties) => {
          fetched.push(...ids);
          return inner.emailGet(target, ids, properties);
        },
      });
    }),
  ).pipe(Layer.provide(JmapMailApi.mock(dataset)));
  return { layer, fetched };
};

// The JMAP sync driven end-to-end against a real ECHO db + a mock JMAP API — no live account. The whole
// pipeline (query, dedup, decode, map, extraction, commit, cursor advance) exercises against generated data.
describe('runJmapSync against a mock JMAP API', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  const seed = (options?: { max?: string; min?: string; options?: Record<string, unknown> }) =>
    seedMailboxBinding(builder, { source: JMAP_MESSAGE_SOURCE, connectorId: JMAP_MAIL_CONNECTOR_ID, ...options });
  const jmapKeyIds = (message: Message.Message) =>
    Obj.getMeta(message)
      .keys.filter((key) => key.source === JMAP_MESSAGE_SOURCE)
      .map((key) => key.id);
  const syncedIdsOf = async (db: Database.Database, mailbox: Mailbox.Mailbox) =>
    (await queryFeedMessages(db, mailbox)).flatMap(jmapKeyIds);

  test('syncs generated emails into the feed with contacts, threads, tags, and cursor', async ({ expect }) => {
    // A window inside the 30-day horizon and away from its day boundaries, so the walk covers the whole
    // dataset regardless of local timezone.
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

    // Folder tags: well-known roles (inbox/sent) map onto shared canonical tags — dropped roles
    // (archive/drafts/trash/junk) produce none — and custom folders become provider-scoped tags.
    // Keyword canonical tags (starred) are materialized up front alongside the folder tags.
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const canonical = new Set([
      ...dataset.folders.flatMap((folder) => {
        const id = folder.role ? SystemTags.JMAP_ROLE_TAGS[folder.role] : undefined;
        return id ? [id] : [];
      }),
      ...Object.values(SystemTags.JMAP_KEYWORD_TAGS).flatMap((id) => (id ? [id] : [])),
    ]);
    const customCount = dataset.folders.filter((folder) => !folder.role).length;
    expect(tags.length).toBe(canonical.size + customCount);

    // Cursor advanced to the last synced key; backfill completed within the run (small dataset).
    expect(binding.max).toBeDefined();
    expect(Number.parseInt(binding.max!, 10)).toBeGreaterThan(0);
    expect(binding.min).toBeDefined();

    // Re-running is a no-op: dedup + cursor prevent duplicate work.
    const rerun = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );
    expect(rerun.newMessages).toBe(0);
    const afterRerun = await queryFeedMessages(db, mailbox);
    expect(afterRerun.length).toBe(feedMessages.length);
    expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
  });

  test('a re-run does not re-download already-synced messages (id-level dedup before fetch)', async ({ expect }) => {
    // Pinned clock so the re-run's forward window lands on the same high-water boundary as the first sync.
    const now = new Date('2026-07-16T12:00:00.000Z');
    const dataset = generateJmapDataset({ count: 12, seed: 55, start: subDays(now, 6), end: subDays(now, 1) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // Initial full sync.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );
    expect((await syncedIdsOf(db, mailbox)).length).toBe(dataset.emails.length);

    // Re-run with a counting API. The forward window still *queries* the boundary message's id
    // (inclusive `after: max`), but it is already committed, so `skipCommitted` drops it before
    // `emailGet` — nothing downloads.
    const { layer, fetched } = countingJmapApi(dataset);
    const rerun = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(Layer.mergeAll(layer, ambientSyncServices(db))),
      ),
    );
    expect(rerun.newMessages).toBe(0);
    expect(fetched).toEqual([]);
  });

  test('advances a live progress monitor keyed by the mailbox URI, and removes it on success', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateJmapDataset({ count: 20, seed: 17, start, end });

    const { db, mailbox, binding } = await seed();

    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    // Removed on success, so subscribe to capture `current` as the run advances it rather than reading
    // the final snapshot.
    const seen: number[] = [];
    const unsubscribe = registry.subscribe(progress.snapshotAtom, (snapshot) => {
      const task = snapshot.tasks.find((task) => task.name === createSyncProgressKey(mailbox));
      if (task) {
        seen.push(task.current);
      }
    });

    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, dataset, { progressRegistry: progress })),
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
    const dataset = generateJmapDataset({ count: 30, seed: 29, start, end });

    const { db, mailbox, binding } = await seed();

    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const key = createSyncProgressKey(mailbox);

    // Cancel as soon as the monitor shows progress, so the run is genuinely mid-flight — the
    // subscription fires synchronously from `advance`, so it races ahead of completion.
    let cancelled = false;
    const unsubscribe = registry.subscribe(progress.snapshotAtom, (snapshot) => {
      const task = snapshot.tasks.find((task) => task.name === key);
      if (task && task.current > 0 && !cancelled) {
        cancelled = true;
        progress.cancel(key);
      }
    });

    // Cancelling aborts as a fiber interrupt (not a typed failure), so `runPromise` rejects. Cleanup
    // runs via the abort's `onCancel`, not the skipped post-run code, so the monitor is still removed.
    await expect(
      EffectEx.runPromise(
        runJmapSync({ binding: Ref.make(binding) }).pipe(
          Effect.provide(inboxJmapSyncTestServices(db, dataset, { progressRegistry: progress })),
        ),
      ),
    ).rejects.toThrow();
    unsubscribe();

    expect(cancelled).toBe(true);
    // Not stuck at 'running' — the abort-path cleanup removes the monitor like the success path.
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
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
    expect(Number.parseInt(binding.max!, 10)).toBe(maxKey(mid)); // max set to the newest synced.
    const lowAfterInitial = Number.parseInt(binding.min!, 10);
    expect(lowAfterInitial).toBeLessThan(minKey(mid)); // backfill completed: min clamped to the horizon.

    // 2) Incremental: forward from `max`. A newer band has arrived; only it syncs, `min` unchanged.
    const r2 = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent))),
      ),
    );
    expect(r2.newMessages).toBe(recent.emails.length);
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
      runJmapSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent, older))),
      ),
    );
    expect(r3.newMessages).toBe(older.emails.length);
    expect(binding.max).toBe(highBeforeWiden);
    expect(Number.parseInt(binding.min!, 10)).toBeLessThan(minKey(older));

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

    // The committed page is durable and a contiguous newest suffix (backward walks newest-first); `min`
    // is the oldest committed key, `max` the newest — no completion (the run errored, not exhausted).
    const committedAfterFault = await syncedIdsOf(db, mailbox);
    expect(committedAfterFault).toHaveLength(10);
    const sortedDesc = [...dataset.emails].sort(
      (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    );
    expect(new Set(committedAfterFault)).toEqual(new Set(sortedDesc.slice(0, 10).map((email) => email.id)));
    expect(Number.parseInt(binding.max!, 10)).toBe(maxKey(dataset));
    expect(Number.parseInt(binding.min!, 10)).toBe(new Date(sortedDesc[9].receivedAt).getTime());

    // Recovery: a healthy run resumes the backward half from `min`, nothing new forward — everything
    // lands exactly once.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );
    const finalIds = await syncedIdsOf(db, mailbox);
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toHaveLength(dataset.emails.length);
    expect(Number.parseInt(binding.min!, 10)).toBeLessThan(minKey(dataset));
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

      // `dedupSeedTail` (5) < messages backfilled after the newest, so a newest-only seed would evict the
      // newest from the dedup set and the forward `after: max` re-fetch would re-commit it (prod: >500).
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

    // Forward (incremental resume): seed a cursor just below the dataset with `syncBackDays` short enough
    // that the horizon sits above `min`, so only the forward window is active. Oldest-first, so a capped
    // run advances `max` gap-free instead of jumping to the newest key and stranding the middle.
    const forwardCursor = String(minKey(dataset) - 1);
    const forward = await seed({ max: forwardCursor, min: forwardCursor, options: { syncBackDays: 1 } });
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

  //
  // Incremental (Email/changes) sync.
  //

  const tokenOf = (binding: Cursor.Cursor): string | undefined =>
    binding.spec.kind === 'external' ? binding.spec.token : undefined;

  test('the first tick captures the Email/get state token (before backfill)', async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = { ...generateJmapDataset({ count: 6, seed: 81, start, end }), state: 'state-0' };
    const { db, mailbox, binding } = await seed();

    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding) }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );

    // The state token is captured and the (window) backfill still ran normally.
    expect(tokenOf(binding)).toBe('state-0');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(dataset.emails.length);
  });

  test('an incremental run syncs only the delta created messages and advances the token', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateJmapDataset({ count: 5, seed: 82, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // First tick: window backfill + capture 'state-0'.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, { ...base, state: 'state-0' })),
      ),
    );
    expect(tokenOf(binding)).toBe('state-0');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(base.emails.length);

    // A new message arrives; the change log advances state-0 → state-1 with it created.
    const arrival = generateJmapDataset({ count: 1, seed: 83, start: subDays(now, 1), end: now, idPrefix: 'new' })
      .emails[0];
    const run2 = {
      ...base,
      emails: [...base.emails, arrival],
      state: 'state-1',
      changeLog: [{ sinceState: 'state-0', newState: 'state-1', created: [arrival.id] }],
    };
    const r2 = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, run2))),
    );

    // Only the delta's created message synced; the token advanced to the new state.
    expect(r2.newMessages).toBe(1);
    expect(tokenOf(binding)).toBe('state-1');
    const ids = await syncedIdsOf(db, mailbox);
    expect(ids).toContain(arrival.id);
    expect(ids.length).toBe(base.emails.length + 1);
  });

  test('a stale state token clears it, falls back to the window scan, and recaptures', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateJmapDataset({ count: 5, seed: 84, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // A prior run left a token the server can no longer resolve (evicted past its retention window).
    Obj.update(binding, (binding) => {
      if (binding.spec.kind === 'external') {
        binding.spec.token = 'evicted';
      }
    });

    // No change-log chain from 'evicted' → the mock fails with `cannotCalculateChanges`.
    const dataset = { ...base, state: 'state-current', changeLog: [] };
    const result = await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
    );

    // Fell back to the full window scan and recaptured the fresh token.
    expect(result.newMessages).toBe(base.emails.length);
    expect(tokenOf(binding)).toBe('state-current');
    expect((await syncedIdsOf(db, mailbox)).length).toBe(base.emails.length);
  });

  test('a crash mid-incremental leaves the token unadvanced and recovers with no duplicate', async ({ expect }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateJmapDataset({ count: 5, seed: 85, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });

    // First tick: backfill + capture 'state-0'.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, { ...base, state: 'state-0' })),
      ),
    );
    expect(tokenOf(binding)).toBe('state-0');

    // A large delta arrives; fault after the first commit page (10) lands.
    const arrivals = generateJmapDataset({ count: 15, seed: 86, start: subDays(now, 1), end: now, idPrefix: 'new' })
      .emails;
    const run2Dataset = {
      ...base,
      emails: [...base.emails, ...arrivals],
      state: 'state-1',
      changeLog: [{ sinceState: 'state-0', newState: 'state-1', created: arrivals.map((email) => email.id) }],
    };
    const exit = await EffectEx.runPromise(
      Effect.exit(runJmapSync({ binding: Ref.make(binding), now })).pipe(
        Effect.provide(ambientSyncServices(db)),
        Effect.provide(withFaultAfterEmails(10, run2Dataset)),
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    // Token NOT advanced — a crash before the delta fully drained keeps it at 'state-0'.
    expect(tokenOf(binding)).toBe('state-0');

    // Recovery: the next run re-fetches the whole delta, dedups the committed prefix, finishes clean.
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, run2Dataset))),
    );
    expect(tokenOf(binding)).toBe('state-1');
    const ids = await syncedIdsOf(db, mailbox);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(base.emails.length + arrivals.length);
  });

  test('an incremental mailbox move retags an existing message (remote-wins) with no new feed append', async ({
    expect,
  }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateJmapDataset({ count: 3, seed: 90, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, { ...base, state: 'state-0' })),
      ),
    );
    const before = (await syncedIdsOf(db, mailbox)).length;
    const targetId = base.emails[0].id;

    // The target email was moved from Inbox to the 'Work' folder (mb-custom-1) on the server.
    const movedEmails = base.emails.map((email) =>
      email.id === targetId ? { ...email, mailboxIds: { 'mb-custom-1': true } } : email,
    );
    const run2 = {
      ...base,
      emails: movedEmails,
      state: 'state-1',
      changeLog: [{ sinceState: 'state-0', newState: 'state-1', updated: [targetId] }],
    };
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, run2))),
    );

    // No new feed message and the token advanced.
    expect((await syncedIdsOf(db, mailbox)).length).toBe(before);
    expect(tokenOf(binding)).toBe('state-1');

    // Remote-wins: the message now carries the Work tag and no longer the Inbox tag.
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const feedMessages = await queryFeedMessages(db, mailbox);
    const target = feedMessages.find((message) => jmapKeyIds(message).includes(targetId))!;
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const uriFor = (folderId: string) =>
      Obj.getURI(tags.find((tag) => Obj.getMeta(tag).keys.some((key) => key.id === folderId))!).toString();
    // The inbox role maps onto the canonical tag, not a folder-keyed provider tag.
    const inboxUri = Obj.getURI(
      tags.find((tag) =>
        Obj.getMeta(tag).keys.some((key) => key.source === SystemTags.SYSTEM_TAG_SOURCE && key.id === 'inbox'),
      )!,
    ).toString();
    const localTags = TagIndex.bind(tagIndex).tags(target.id);
    expect(localTags).toContain(uriFor('mb-custom-1'));
    expect(localTags).not.toContain(inboxUri);
  });

  test('an incremental $flagged keyword add stars an existing message (canonical starred tag)', async ({
    expect,
  }) => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const base = generateJmapDataset({ count: 3, seed: 93, start: subDays(now, 6), end: subDays(now, 2) });
    const { db, mailbox, binding } = await seed({ options: { syncBackDays: 14 } });
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(
        Effect.provide(inboxJmapSyncTestServices(db, { ...base, state: 'state-0' })),
      ),
    );
    const targetId = base.emails[0].id;

    // The target email was flagged (starred) on the server.
    const flaggedEmails = base.emails.map((email) =>
      email.id === targetId ? { ...email, keywords: { $flagged: true } } : email,
    );
    const run2 = {
      ...base,
      emails: flaggedEmails,
      state: 'state-1',
      changeLog: [{ sinceState: 'state-0', newState: 'state-1', updated: [targetId] }],
    };
    await EffectEx.runPromise(
      runJmapSync({ binding: Ref.make(binding), now }).pipe(Effect.provide(inboxJmapSyncTestServices(db, run2))),
    );

    // The message gained the canonical starred tag — the same one the local star toggle resolves.
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const feedMessages = await queryFeedMessages(db, mailbox);
    const target = feedMessages.find((message) => jmapKeyIds(message).includes(targetId))!;
    const tags = await db.query(Filter.type(Tag.Tag)).run();
    const starredUri = Obj.getURI(
      tags.find((tag) =>
        Obj.getMeta(tag).keys.some((key) => key.source === SystemTags.SYSTEM_TAG_SOURCE && key.id === 'starred'),
      )!,
    ).toString();
    expect(TagIndex.bind(tagIndex).tags(target.id)).toContain(starredUri);
  });
});
