//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, NotFound } from '@dxos/app-toolkit';
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
    const client = yield* Capability.get(ClientCapabilities.Client);

    // Remote existence check (does not materialize a local node); reuses the shared edge checker.
    const checkRemote = NotFound.createEdgeExistenceChecker((spaceId, body) =>
      client.edge.http.execQuery(new Context(), spaceId, body),
    );

    const loader: AppCapabilities.NavigationTargetLoader = {
      id: meta.profile.key,
      load: ({ spaceId, entityId }) =>
        Effect.gen(function* () {
          if (!SpaceId.isValid(spaceId) || !EntityId.isValid(entityId)) {
            return false;
          }
          const eid = EID.make({ spaceId, entityId });

          // Local first: loading the object populates the collection/type-section refs that address
          // it, so the next graph expansion materializes its node. Wait for the space to be ready so a
          // cold restore (space not yet loaded when the URL is resolved) still finds it.
          const space = client.spaces.get(spaceId);
          if (space) {
            const loaded = yield* Effect.promise(() => space.waitUntilReady()).pipe(
              Effect.flatMap(() => Database.load(space.db.makeRef(eid))),
              Effect.as(true),
              Effect.catchAll(() => Effect.succeed(false)),
            );
            if (loaded) {
              return true;
            }
          }

          // Remote fallback: confirms the object exists somewhere, even if it has not replicated
          // locally yet (in which case the node cannot render until it does). Bounded so an
          // unreachable edge cannot hang navigation.
          return yield* checkRemote(eid).pipe(
            Effect.timeout(EDGE_EXISTENCE_TIMEOUT),
            Effect.catchAll(() => Effect.succeed(false)),
          );
        }),
    };

    return Capability.contributes(AppCapabilities.NavigationTargetLoader, loader);
  }),
);
