//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Person } from '@dxos/types';

import { JMAP_MAIL_CONNECTOR_ID, JMAP_MESSAGE_SOURCE } from '../../../constants';
import { generateJmapDataset } from '../../../testing/jmap-fixtures';
import { inboxJmapSyncTestServices, seedMailboxBinding } from '../../../testing/sync-fixture';
import { Mailbox } from '../../../types';
import { runJmapSync } from './sync';

/** Reads all synced messages from a seeded mailbox's feed. */
const queryFeedMessages = (db: Database.Database, mailbox: Mailbox.Mailbox) =>
  db.query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(mailbox.feed.target!)!))).run();

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

  const seed = () => seedMailboxBinding(builder, { source: JMAP_MESSAGE_SOURCE, connectorId: JMAP_MAIL_CONNECTOR_ID });
  const jmapKeyIds = (message: Message.Message) =>
    Obj.getMeta(message)
      .keys.filter((key) => key.source === JMAP_MESSAGE_SOURCE)
      .map((key) => key.id);

  test(
    'syncs generated emails into the feed with contacts, threads, tags, and cursor',
    { timeout: 30_000 },
    async ({ expect }) => {
      // A window comfortably inside the default 30-day sync horizon (and away from its day boundaries),
      // so the window walk covers the whole dataset regardless of the local timezone.
      const end = subDays(new Date(), 3);
      const start = subDays(new Date(), 12);
      const dataset = generateJmapDataset({ count: 40, seed: 11, start, end });
      // Start the walk just before the data so the resolved horizon covers it.
      const after = subDays(new Date(), 14).toISOString();

      const { db, mailbox, binding } = await seed();

      const { result, feedMessages } = await EffectEx.runPromise(
        Effect.gen(function* () {
          const result = yield* runJmapSync({ binding: Ref.make(binding), after });
          const feedMessages = yield* Effect.promise(() => queryFeedMessages(db, mailbox));
          return { result, feedMessages };
        }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
      );

      // The window walk fetched some emails; every synced message is a distinct dataset email.
      const datasetIds = new Set(dataset.emails.map((email) => email.id));
      const syncedIds = feedMessages.flatMap(jmapKeyIds);
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

      // Cursor advanced to the last synced key.
      const cursorValue = binding.cursor.target?.value;
      expect(cursorValue).toBeDefined();
      expect(Number.parseInt(cursorValue!, 10)).toBeGreaterThan(0);

      // Re-running is a no-op: dedup + cursor prevent duplicate work.
      const rerun = await EffectEx.runPromise(
        runJmapSync({ binding: Ref.make(binding), after }).pipe(Effect.provide(inboxJmapSyncTestServices(db, dataset))),
      );
      expect(rerun.newMessages).toBe(0);
      const afterRerun = await queryFeedMessages(db, mailbox);
      expect(afterRerun.length).toBe(feedMessages.length);
      expect((await db.query(Filter.type(Person.Person)).run()).length).toBe(people.length);
    },
  );

  test(
    'initial backward, incremental forward, and backfill (cursor stays put)',
    { timeout: 30_000 },
    async ({ expect }) => {
      const now = new Date();
      const day = (ago: number) => subDays(now, ago).toISOString();
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
      const maxKey = (dataset: typeof mid) =>
        Math.max(...dataset.emails.map((email) => new Date(email.receivedAt).getTime()));

      const { db, mailbox, binding } = await seed();
      const cursorKey = () => Number.parseInt(binding.cursor.target?.value ?? '0', 10);
      const feedIds = async () => {
        const messages = await queryFeedMessages(db, mailbox);
        return messages.flatMap(jmapKeyIds);
      };

      // 1) Initial: no cursor → backward from today down to the horizon (after). Only `mid` is available.
      const r1 = await EffectEx.runPromise(
        runJmapSync({ binding: Ref.make(binding), after: day(14) }).pipe(
          Effect.provide(inboxJmapSyncTestServices(db, mid)),
        ),
      );
      expect(r1.newMessages).toBe(mid.emails.length);
      expect(cursorKey()).toBe(maxKey(mid)); // cursor set to the newest synced.

      // 2) Incremental: cursor present → forward from the cursor. A newer band has arrived; only it syncs.
      const r2 = await EffectEx.runPromise(
        runJmapSync({ binding: Ref.make(binding), after: day(14) }).pipe(
          Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent))),
        ),
      );
      expect(r2.newMessages).toBe(recent.emails.length);
      expect(cursorKey()).toBe(maxKey(recent)); // cursor advanced to the newest.

      // 3) Backfill: explicit backward over an older window (below the cursor). Fills gaps; cursor unchanged.
      const cursorBeforeBackfill = cursorKey();
      const r3 = await EffectEx.runPromise(
        runJmapSync({ binding: Ref.make(binding), direction: 'backward', before: day(14), after: day(30) }).pipe(
          Effect.provide(inboxJmapSyncTestServices(db, union(mid, recent, older))),
        ),
      );
      expect(r3.newMessages).toBe(older.emails.length);
      expect(cursorKey()).toBe(cursorBeforeBackfill); // backfill does NOT move the monotonic cursor.

      // All three bands landed exactly once.
      const ids = await feedIds();
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(mid.emails.length + recent.emails.length + older.emails.length);
    },
  );
});
