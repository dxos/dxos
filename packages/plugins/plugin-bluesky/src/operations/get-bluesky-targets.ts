//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { BLUESKY_TARGET } from '../constants';
import { IntegrationDatabaseMissingError, MissingBlueskyHandleError } from '../errors';
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
    Effect.fn(function* ({ integration: integrationRef }) {
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

      // Saved feeds: best-effort. If `getPreferences` fails (Edge proxy,
      // schema drift, …) still return the self-targets so the user has
      // something to pick from.
      const savedFeeds = yield* Effect.tryPromise(() =>
        BlueskyApi.getSavedFeeds({
          client,
          spaceId: db.spaceId,
          accessTokenId: accessToken.id,
        }),
      ).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            log.warn('failed to load Bluesky saved feeds', { error });
            return [] as BlueskyApi.SavedFeed[];
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
