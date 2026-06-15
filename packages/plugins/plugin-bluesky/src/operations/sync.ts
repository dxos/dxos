//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { createFeedServiceLayer } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, Feed as EchoFeed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Subscription } from '@dxos/plugin-feed';
import { type Integration } from '@dxos/plugin-integration';

import { BLUESKY_TARGET, DEFAULT_MAX_PAGES, MAX_PAGES_HARD_CAP } from '../constants';
import { IntegrationDatabaseMissingError } from '../errors';
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

      let appended = 0;
      let failed = 0;

      // The credentials layer loads the integration's access token, validates
      // the handle, and resolves the user's PDS once. Public XRPC reads
      // (e.g. `getAuthorFeed`) only need HttpClient and ignore the layer.
      return yield* Effect.gen(function* () {
        for (const [index, target] of integration.targets.entries()) {
          if (!target.remoteId) {
            continue;
          }
          const result = yield* Effect.either(syncTarget({ client, integration, db, targetIndex: index }));
          if (result._tag === 'Right') {
            appended += result.right;
          } else {
            failed++;
            log.warn('Bluesky target sync failed', { remoteId: target.remoteId, error: result.left });
          }
        }
        return { appended, failed };
      }).pipe(
        Effect.provide(BlueskyApi.Credentials.fromIntegration(integrationRef, client)),
        Effect.provide(FetchHttpClient.layer),
      );
    }),
  ),
);

export default handler;

const syncTarget = ({
  client,
  integration,
  db,
  targetIndex,
}: {
  client: Client;
  integration: Integration.Integration;
  db: Database.Database;
  targetIndex: number;
}) =>
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

    // Walk pages from newest backwards, stopping at the URI we last saw
    // (`target.cursor`) or after the per-target page budget. atproto returns
    // newest first, so anything we collect can be appended in the order it
    // came back without an explicit reverse.
    //
    // Per-target page budget: self-targets (chronological) get the larger
    // default since cursor-stopping bounds them on incremental syncs;
    // custom feeds are algorithmic so we cap conservatively. Both honour
    // an explicit `target.options.maxPages` override, clamped to the
    // hard safety cap.
    const lastSeen = target.cursor;
    const maxPages = resolveMaxPages(remoteId, target.options as { maxPages?: number } | undefined);
    const collected: BlueskyApi.FeedViewPost[] = [];
    let pageCursor: string | undefined;
    let newestUri: string | undefined;
    let reachedKnown = false;

    for (let page = 0; page < maxPages; page++) {
      const response = yield* fetchPostsForTarget({ remoteId, cursor: pageCursor });
      if (response.feed.length === 0) {
        break;
      }
      if (newestUri === undefined) {
        newestUri = response.feed[0]?.post.uri;
      }
      for (const item of response.feed) {
        if (lastSeen && item.post.uri === lastSeen) {
          reachedKnown = true;
          break;
        }
        collected.push(item);
      }
      if (reachedKnown || !response.cursor) {
        break;
      }
      pageCursor = response.cursor;
    }

    if (collected.length === 0) {
      // Still record a successful run so the UI shows recent activity.
      Obj.update(integration, (integration) => {
        integration.targets[targetIndex] = {
          ...integration.targets[targetIndex],
          lastSyncAt: new Date().toISOString(),
          lastError: undefined,
        };
      });
      return 0;
    }

    const echoFeed = subscriptionFeed.feed?.target;
    invariant(echoFeed, 'Subscription.Feed missing backing ECHO feed');
    invariant(EchoFeed.getQueueUri(echoFeed), 'ECHO feed not stored in a space');
    const space = client.spaces.get(db.spaceId);
    invariant(space, 'space not found');

    const feedRef = Ref.make(subscriptionFeed);
    const postObjects = collected.map((item) => {
      const input = BlueskyApi.toSubscriptionPostInput(item);
      return Subscription.makePost({ source: feedRef, ...input });
    });
    yield* EchoFeed.append(echoFeed, postObjects).pipe(Effect.provide(createFeedServiceLayer(space.queues)));

    if (newestUri) {
      Obj.update(subscriptionFeed, (subscriptionFeed) => {
        subscriptionFeed.cursor = newestUri;
      });
    }

    Obj.update(integration, (integration) => {
      integration.targets[targetIndex] = {
        ...integration.targets[targetIndex],
        // Track the newest post URI so the next sync stops there.
        cursor: newestUri,
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
}) =>
  Effect.gen(function* () {
    const target = integration.targets[targetIndex];
    const existing = target?.object?.target;
    if (existing && Subscription.instanceOf(existing)) {
      return existing;
    }
    const newFeed = Subscription.makeSubscription({
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

/**
 * Resolve the per-sync page budget for a target. User-supplied
 * `target.options.maxPages` takes precedence (clamped to {@link MAX_PAGES_HARD_CAP});
 * otherwise self-targets get the chronological default and custom feeds
 * get the algorithmic-feed default.
 */
const resolveMaxPages = (remoteId: string, options: { maxPages?: number } | undefined): number => {
  const override = options?.maxPages;
  if (typeof override === 'number' && override > 0) {
    return Math.min(override, MAX_PAGES_HARD_CAP);
  }
  return remoteId.startsWith(BLUESKY_TARGET.FEED_PREFIX) ? DEFAULT_MAX_PAGES.FEED : DEFAULT_MAX_PAGES.SELF;
};

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

/**
 * Dispatch on the target's `remoteId` to the right Bluesky XRPC call.
 * The authenticated branches pull credentials (handle, PDS, token, …) from
 * the `Credentials` service, so the only state needed here is the
 * target's id and the page cursor.
 */
const fetchPostsForTarget = ({ remoteId, cursor }: { remoteId: string; cursor: string | undefined }) =>
  Effect.gen(function* () {
    if (remoteId === BLUESKY_TARGET.MY_POSTS) {
      const creds = yield* BlueskyApi.Credentials;
      return yield* BlueskyApi.getAuthorFeed({ actor: creds.handle, cursor });
    }
    if (remoteId === BLUESKY_TARGET.MY_LIKES) {
      const creds = yield* BlueskyApi.Credentials;
      return yield* BlueskyApi.getActorLikes({ actor: creds.handle, cursor });
    }
    if (remoteId === BLUESKY_TARGET.MY_BOOKMARKS) {
      return yield* BlueskyApi.getBookmarks({ cursor });
    }
    if (remoteId.startsWith(BLUESKY_TARGET.FEED_PREFIX)) {
      return yield* BlueskyApi.getFeed({
        feed: remoteId.slice(BLUESKY_TARGET.FEED_PREFIX.length),
        cursor,
      });
    }
    return { feed: [] } as BlueskyApi.GetFeedResponse;
  });
