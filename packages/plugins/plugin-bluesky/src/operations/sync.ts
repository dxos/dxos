//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database, Feed as EchoFeed, Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { Subscription } from '@dxos/plugin-magazine';
import { Cursor } from '@dxos/types';

import { BLUESKY_TARGET, DEFAULT_MAX_PAGES, MAX_PAGES_HARD_CAP } from '../constants';
import { BlueskyApi } from '../services';
import { SyncBlueskyTargets } from './definitions';

const handler: Operation.WithHandler<typeof SyncBlueskyTargets> = SyncBlueskyTargets.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ binding: bindingRef }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const binding = yield* Database.load(bindingRef);
      const cursor = yield* Database.load(binding.cursor);
      const connection = Relation.getSource(binding);
      const db = Obj.getDatabase(binding);
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      // The credentials layer loads the connection's access token, validates
      // the handle, and resolves the user's PDS once. Public XRPC reads
      // (e.g. `getAuthorFeed`) only need HttpClient and ignore the layer.
      return yield* syncBinding({ client, binding, cursor, connection, db }).pipe(
        Effect.provide(BlueskyApi.Credentials.fromConnection(Ref.make(connection), client)),
        Effect.provide(FetchHttpClient.layer),
      );
    }),
  ),
);

export default handler;

const syncBinding = ({
  client,
  binding,
  cursor,
  connection,
  db,
}: {
  client: Client;
  binding: SyncBinding.SyncBinding;
  cursor: Cursor.Cursor;
  connection: Connection.Connection;
  db: Database.Database;
}) =>
  Effect.gen(function* () {
    const remoteId = binding.remoteId;
    if (!remoteId) {
      return { appended: 0 };
    }

    const localRoot = Relation.getTarget(binding);
    if (!Subscription.instanceOf(localRoot)) {
      log.warn('Bluesky binding target is not a Subscription.Feed; skipping', { remoteId });
      return { appended: 0 };
    }
    const subscriptionFeed = localRoot;

    // Walk pages from newest backwards, stopping at the URI we last saw
    // (`binding.cursor`) or after the per-target page budget. atproto returns
    // newest first, so anything we collect can be appended in the order it
    // came back without an explicit reverse.
    //
    // Per-target page budget: self-targets (chronological) get the larger
    // default since cursor-stopping bounds them on incremental syncs;
    // custom feeds are algorithmic so we cap conservatively. Both honour
    // an explicit `binding.options.maxPages` override, clamped to the
    // hard safety cap.
    const lastSeen = cursor.value;
    const maxPages = resolveMaxPages(remoteId, binding.options as { maxPages?: number } | undefined);
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
      Cursor.advance(cursor);
      return { appended: 0 };
    }

    const echoFeed = subscriptionFeed.feed?.target;
    invariant(echoFeed, 'Subscription.Feed missing backing ECHO feed');
    invariant(EchoFeed.getFeedUri(echoFeed), 'ECHO feed not stored in a space');
    const space = client.spaces.get(db.spaceId);
    invariant(space, 'space not found');

    const feedRef = Ref.make(subscriptionFeed);
    const postObjects = collected.map((item) => {
      const input = BlueskyApi.toSubscriptionPostInput(item);
      return Subscription.makePost({ source: feedRef, ...input });
    });
    yield* EchoFeed.append(echoFeed, postObjects).pipe(Effect.provide(Database.layer(space.db)));

    if (newestUri) {
      Obj.update(subscriptionFeed, (subscriptionFeed) => {
        subscriptionFeed.cursor = newestUri;
      });
    }

    // Track the newest post URI so the next sync stops there.
    Cursor.advance(cursor, newestUri);

    return { appended: postObjects.length };
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() => Cursor.recordError(cursor, error instanceof Error ? error.message : String(error))),
    ),
  );

/**
 * Resolve the per-sync page budget for a target. User-supplied
 * `binding.options.maxPages` takes precedence (clamped to {@link MAX_PAGES_HARD_CAP});
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
