//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Subscription } from '@dxos/plugin-magazine';

import { BLUESKY_SOURCE, BLUESKY_TARGET } from '../constants';
import { MaterializeBlueskyTarget } from './definitions';

/**
 * Find-or-create the empty local `Subscription.Feed` root for a Bluesky target
 * so a {@link SyncBinding} relation can be created eagerly (relations require
 * both endpoints to exist). Keyed by the target's `remoteId` foreign key, so
 * re-running on the same `(space, remoteId)` returns the same Subscription.
 * Idempotent. The feed starts empty; posts are appended on first sync.
 */
const handler: Operation.WithHandler<typeof MaterializeBlueskyTarget> = MaterializeBlueskyTarget.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ connection, remoteTarget }) {
      invariant(remoteTarget, 'Bluesky is a multi-target connector; remoteTarget is required.');
      // TODO(wittjosiah): the operation should just depend on `Database.Service` and
      //   have it provided by the OperationInvoker — composer's invoker is wired
      //   without a `databaseResolver`, so we derive the db from the connection ref's
      //   target and provide `Database.layer(db)` ourselves.
      const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }
      const remoteId = remoteTarget.id;

      return yield* Effect.gen(function* () {
        const existing = yield* Database.query(
          Query.select(Filter.foreignKeys(Subscription.Subscription, [{ source: BLUESKY_SOURCE, id: remoteId }])),
        ).run;
        if (existing.length > 0) {
          return { target: Ref.make(existing[0]) };
        }

        const subscription = Subscription.makeSubscription({
          [Obj.Meta]: { keys: [{ source: BLUESKY_SOURCE, id: remoteId }] },
          name: remoteTarget.name,
          url: remoteIdToFeedUrl(remoteId),
          type: 'atproto',
        });
        const created = yield* Database.add(subscription);
        return { target: Ref.make(created) };
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;

/** Best-effort URL representation of a target so the Subscription.Feed has something to display. */
const remoteIdToFeedUrl = (remoteId: string): string => {
  if (remoteId === BLUESKY_TARGET.MY_POSTS) {
    return 'bsky:self/posts';
  }
  if (remoteId === BLUESKY_TARGET.MY_LIKES) {
    return 'bsky:self/likes';
  }
  if (remoteId === BLUESKY_TARGET.MY_BOOKMARKS) {
    return 'bsky:self/bookmarks';
  }
  if (remoteId.startsWith(BLUESKY_TARGET.FEED_PREFIX)) {
    return remoteId.slice(BLUESKY_TARGET.FEED_PREFIX.length);
  }
  return remoteId;
};
