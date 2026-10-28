//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, type Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Message } from '@dxos/types';

import { GMAIL_SOURCE } from '../../constants.ts';
import { type SpaceSnapshot, type SyncedMessage, groupInvocations } from '../checks/index.ts';
import { CanarySpaceError } from './errors.ts';

/**
 * Reads what the checks need from the canary space: the mailbox's synced messages, the mail sync's
 * invocations from the Execution Trace feed, and the space's triggers. Both feeds are pulled first,
 * since a feed replicates apart from the documents and a fresh client holds only part of it.
 */
export const readSnapshot = Effect.fn('mail-canary.readSnapshot')(
  function* () {
    const [mailbox] = yield* Database.query(Filter.type(Mailbox.Mailbox)).run;
    if (!mailbox) {
      return yield* new CanarySpaceError({ message: 'the space has no mailbox' });
    }
    const messages = yield* readMailbox(yield* Database.load(mailbox.feed));

    // Racing writers can create a second trace feed, so every one is read (as `react-ui-trace` does).
    const traceFeeds = yield* Database.query(FeedTraceSink.query).run;
    if (traceFeeds.length === 0) {
      return yield* new CanarySpaceError({ message: 'the space has no Execution Trace feed' });
    }
    const traceMessages = (yield* Effect.forEach(traceFeeds, readTraceFeed)).flat();

    const triggers = (yield* Database.query(Filter.type(Trigger.Trigger)).run)
      .filter((trigger) => trigger.remote === true && trigger.spec?.kind === 'timer')
      .map((trigger) => ({ id: trigger.id, enabled: trigger.enabled === true }));

    return {
      invocations: groupInvocations(traceMessages),
      messages,
      triggers,
    } satisfies SpaceSnapshot;
  },
  Effect.mapError((error) =>
    error instanceof CanarySpaceError ? error : new CanarySpaceError({ message: String(error) }),
  ),
);

const pull = (feed: Feed.Feed) =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) => Effect.tryPromise(() => db.syncFeed(feed, { shouldPush: false }))),
    // EDGE answers the pull's query slowly at times; a retry clears it.
    Effect.retry({ times: 2 }),
  );

const readMailbox = Effect.fn(function* (feed: Feed.Feed) {
  yield* pull(feed);
  const messages = yield* Database.query(Query.select(Filter.type(Message.Message)).from(feed)).run;
  return messages.flatMap((message): SyncedMessage[] => {
    const gmailId = Obj.getKeys(message, GMAIL_SOURCE).at(0)?.id;
    return gmailId ? [{ gmailId, subject: message.properties?.subject, sender: message.sender.email }] : [];
  });
});

const readTraceFeed = Effect.fn(function* (feed: Feed.Feed) {
  yield* pull(feed);
  return yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed).orderBy(Order.natural())).run;
});
