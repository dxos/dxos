//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { BLUESKY_TARGET } from '../constants';
import { BlueskyApi } from '../services';
import { GetBlueskyTargets } from './definitions';

/**
 * Fixed self-targets every Bluesky integration exposes. The remote-id is the
 * stable string the user re-selects against; `name` drives the label in the
 * sync-targets dialog.
 */
const SELF_TARGETS = [
  { id: BLUESKY_TARGET.MY_POSTS, name: 'My posts', description: 'Your author feed.' },
  { id: BLUESKY_TARGET.MY_LIKES, name: 'My liked posts', description: 'Posts you have liked.' },
  { id: BLUESKY_TARGET.MY_BOOKMARKS, name: 'My saved posts', description: 'Posts you have saved.' },
] as const;

const handler: Operation.WithHandler<typeof GetBlueskyTargets> = GetBlueskyTargets.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ connection: connectionRef }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const connection = yield* Database.load(connectionRef);
      if (!Obj.getDatabase(connection)) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      // Saved feeds are best-effort. Credentials construction (PDS resolve,
      // missing handle, edge config) and `getPreferences` can all fail —
      // fall back to self-targets so the user always has something to pick
      // from.
      const savedFeeds = yield* BlueskyApi.getSavedFeeds().pipe(
        Effect.provide(BlueskyApi.Credentials.fromConnection(connectionRef, client)),
        Effect.provide(FetchHttpClient.layer),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            log.warn('failed to load Bluesky saved feeds', { error });
            return [] as ReadonlyArray<BlueskyApi.SavedFeed>;
          }),
        ),
      );

      const feedTargets = savedFeeds
        // Skip the home timeline pseudo-entry — that's covered by `MY_POSTS`
        // for the user's own posts; the global timeline is enormous and
        // not interesting to sync into a local feed.
        .filter((entry) => entry.type === 'feed' || entry.type === 'list')
        .map((entry) => ({
          id: `${BLUESKY_TARGET.FEED_PREFIX}${entry.value}`,
          name: entry.value.split('/').pop() ?? entry.value,
          description: entry.value,
        }));

      return {
        targets: [...SELF_TARGETS.map((target) => ({ ...target })), ...feedTargets],
      };
    }),
  ),
);

export default handler;
