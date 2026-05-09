//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database, Feed as EchoFeed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Subscription } from '@dxos/plugin-feed/types';
import { type Integration } from '@dxos/plugin-integration/types';
import { type AccessToken } from '@dxos/types';

import { BLUESKY_TARGET } from '../constants';
import { IntegrationDatabaseMissingError, MissingBlueskyHandleError } from '../errors';
import { BlueskyApi } from '../services';
import { SyncBlueskyTargets } from './definitions';

const handler: Operation.WithHandler<typeof SyncBlueskyTargets> = SyncBlueskyTargets.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ integration: integrationRef }) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const integration = yield* Database.load(integrationRef);
      const db = Obj.getDatabase(integration);
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }
      const accessToken = yield* Database.load(integration.accessToken);
      const handle = accessToken.account;
      if (!handle) {
        return yield* Effect.fail(new MissingBlueskyHandleError());
      }

      let appended = 0;
      let failed = 0;

      for (const [index, target] of integration.targets.entries()) {
        if (!target.remoteId) {
          continue;
        }
        const result = yield* Effect.either(
          syncTarget({
            client,
            integration,
            accessToken,
            handle,
            db,
            targetIndex: index,
          }),
        );
        if (result._tag === 'Right') {
          appended += result.right;
        } else {
          failed++;
          log.warn('Bluesky target sync failed', { remoteId: target.remoteId, error: result.left });
        }
      }

      return { appended, failed };
    }),
  ),
);

export default handler;

const syncTarget = ({
  client,
  integration,
  accessToken,
  handle,
  db,
  targetIndex,
}: {
  client: Client;
  integration: Integration.Integration;
  accessToken: AccessToken.AccessToken;
  handle: string;
  db: Database.Database;
  targetIndex: number;
}): Effect.Effect<number, Error> =>
  Effect.gen(function* () {
    const target = integration.targets[targetIndex];
    invariant(target, 'target index out of range');
    const remoteId = target.remoteId!;

    // Resolve / materialize the local Subscription.Feed for this target.
    const subscriptionFeed = yield* resolveOrCreateLocalFeed({
      db,
      integration,
      targetIndex,
      remoteId,
      name: target.name ?? remoteId,
    });

    const fetched = yield* fetchPostsForTarget({
      client,
      spaceId: db.spaceId,
      accessTokenId: accessToken.id,
      handle,
      remoteId,
      cursor: subscriptionFeed.cursor,
    });

    if (fetched.feed.length === 0) {
      return 0;
    }

    const echoFeed = subscriptionFeed.feed?.target;
    invariant(echoFeed, 'Subscription.Feed missing backing ECHO feed');
    const feedDxn = EchoFeed.getQueueDxn(echoFeed);
    invariant(feedDxn, 'ECHO feed not stored in a space');
    const space = client.spaces.get(db.spaceId);
    invariant(space, 'space not found');

    const newest = fetched.feed[0]?.post.uri;
    const cursor = subscriptionFeed.cursor;
    const newItems = cursor ? fetched.feed.filter((item) => item.post.uri !== cursor) : fetched.feed;

    const feedRef = Ref.make(subscriptionFeed);
    const postObjects = newItems.map((item) => {
      const input = BlueskyApi.toSubscriptionPostInput(item);
      return Subscription.makePost({ feed: feedRef, ...input });
    });
    if (postObjects.length > 0) {
      const queue = space.queues.get(feedDxn);
      yield* Effect.tryPromise(() => queue.append(postObjects));
    }

    if (newest) {
      Obj.update(subscriptionFeed, (subscriptionFeed) => {
        subscriptionFeed.cursor = newest;
      });
    }

    Obj.update(integration, (integration) => {
      integration.targets[targetIndex] = {
        ...integration.targets[targetIndex],
        lastSyncAt: new Date().toISOString(),
        lastError: undefined,
      };
    });

    return postObjects.length;
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() =>
        Obj.update(integration, (integration) => {
          integration.targets[targetIndex] = {
            ...integration.targets[targetIndex],
            lastError: error instanceof Error ? error.message : String(error),
          };
        }),
      ),
    ),
  );

/**
 * Reuse the target's stored `object` if it points to a Subscription.Feed;
 * otherwise create one and pin it to the target.
 */
const resolveOrCreateLocalFeed = ({
  db,
  integration,
  targetIndex,
  remoteId,
  name,
}: {
  db: Database.Database;
  integration: Integration.Integration;
  targetIndex: number;
  remoteId: string;
  name: string;
}): Effect.Effect<Subscription.Feed, Error> =>
  Effect.gen(function* () {
    const target = integration.targets[targetIndex];
    const existing = target?.object?.target;
    if (existing && Subscription.instanceOf(existing)) {
      return existing;
    }
    const newFeed = Subscription.makeFeed({
      name,
      url: remoteIdToFeedUrl(remoteId),
      type: 'atproto',
    });
    const persisted = db.add(newFeed);
    Obj.update(integration, (integration) => {
      integration.targets[targetIndex] = {
        ...integration.targets[targetIndex],
        object: Ref.make(persisted),
      };
    });
    return persisted;
  });

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

const fetchPostsForTarget = ({
  client,
  spaceId,
  accessTokenId,
  handle,
  remoteId,
  cursor,
}: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
  handle: string;
  remoteId: string;
  cursor: string | undefined;
}): Effect.Effect<BlueskyApi.GetFeedResponse, Error> =>
  Effect.tryPromise({
    try: () => {
      switch (remoteId) {
        case BLUESKY_TARGET.MY_POSTS:
          return BlueskyApi.getAuthorFeed({ actor: handle, cursor });
        case BLUESKY_TARGET.MY_LIKES:
          return BlueskyApi.getActorLikes({ client, spaceId, accessTokenId, actor: handle, cursor });
        case BLUESKY_TARGET.MY_BOOKMARKS:
          return BlueskyApi.getBookmarks({ client, spaceId, accessTokenId, cursor });
        default:
          if (remoteId.startsWith(BLUESKY_TARGET.FEED_PREFIX)) {
            return BlueskyApi.getFeed({
              client,
              spaceId,
              accessTokenId,
              feed: remoteId.slice(BLUESKY_TARGET.FEED_PREFIX.length),
              cursor,
            });
          }
          return Promise.resolve<BlueskyApi.GetFeedResponse>({ feed: [] });
      }
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });
