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

// The Gmail sync driven end-to-end against a real ECHO db + a mock Gmail API — no live account. This
// is the seam that Stage 1 opened up (`runGmailSync` requires `GoogleMailApi` rather than providing
// the live HTTP client itself), so the whole pipeline — fetch, dedup, decode, map, contact/thread
// extraction, tag application, commit, cursor advance — exercises against generated data.
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
});
