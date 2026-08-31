//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { Context } from '@dxos/context';
import { Database, EID } from '@dxos/echo';
import { EntityId, SpaceId } from '@dxos/keys';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

/** Cap on the remote edge existence check so an unreachable edge cannot block navigation. */
const EDGE_EXISTENCE_TIMEOUT = '3 seconds';

/**
 * Loads a navigation target by `(spaceId, entityId)` on behalf of the layout plugins, so they can
 * restore a URL-addressed plank without depending on the client for object loading. Loads the object
 * into local ECHO (materializing its graph node) when it exists locally, and otherwise checks remote
 * existence via edge. See {@link AppCapabilities.NavigationTargetLoader}.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;

    // The fallible probe, not the checker: a failed query must stay distinguishable from an empty one.
    const checkRemote = NotFound.createEdgeExistenceProbe((spaceId, body) =>
      client.edge.http.execQuery(new Context(), spaceId, body),
    );

    const loader: AppCapabilities.NavigationTargetLoader = {
      id: meta.profile.key,
      load: ({ spaceId, entityId }) =>
        Effect.gen(function* () {
          // A synthetic node id is not evidence that anything was deleted.
          if (!SpaceId.isValid(spaceId) || !EntityId.isValid(entityId)) {
            return 'unknown';
          }
          // A URL restore can call this while the forked client initialization is still
          // running; `spaces` is unreadable until it completes, and failing here would
          // fail-fast the plank to not-found.
          yield* Effect.promise(() => client.waitUntilInitialized());
          const eid = EID.make({ spaceId, entityId });

          // Local first: loading the object populates the collection/type-section refs that address
          // it, so the next graph expansion materializes its node. Never `absent` on a miss —
          // `spaces.get` reads a list `waitUntilInitialized` does not guarantee has arrived.
          const space = client.spaces.get(spaceId);
          if (space) {
            const loaded = yield* Effect.promise(() => space.waitUntilReady()).pipe(
              Effect.flatMap(() => Database.load(space.db.makeRef(eid))),
              Effect.as(true),
              Effect.catch(() => Effect.succeed(false)),
            );
            if (loaded) {
              return 'exists';
            }
          }

          // Remote fallback: confirms the object exists somewhere, even if it has not replicated
          // locally yet. The only path to `absent` — a timeout or transport failure went unanswered.
          return yield* checkRemote(eid).pipe(
            Effect.map((exists): AppCapabilities.NavigationTargetVerdict => (exists ? 'exists' : 'absent')),
            Effect.timeoutOrElse({
              duration: EDGE_EXISTENCE_TIMEOUT,
              orElse: () => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown'),
            }),
            Effect.catch(() => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown')),
          );
        }),
    };

    return Capability.contribute(AppCapabilities.NavigationTargetLoader, loader);
  }),
);
