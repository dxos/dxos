//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppSpace, NavigationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, EID } from '@dxos/echo';
import { Position } from '@dxos/util';

import { ClientCapabilities } from '../types';

const handler: Operation.WithHandler<typeof NavigationOperation.ResolveNavigationTargets> =
  NavigationOperation.ResolveNavigationTargets.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ query }) {
        const capabilities = yield* Capability.Service;
        const client = yield* Capability.get(ClientCapabilities.Client).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        );

        // Resolvers read a space database to derive a navigation path, so this handler lives with the
        // client: it is the only place that can turn a URI's space id into a database to provide. When
        // the query names a space that is not available, resolve nothing — falling back to the active
        // space would resolve the id against the wrong database (a ref can reach across spaces). The
        // active space serves only space-less queries (`dxn:` URIs, local EIDs, no query).
        const eid = query?.uri ? EID.tryParse(query.uri) : undefined;
        const spaceId = eid ? EID.getSpaceId(eid) : undefined;
        const space = client
          ? spaceId
            ? client.spaces.get(spaceId)
            : AppSpace.getActiveSpace(client, capabilities)
          : undefined;

        // Resolvers require `Database.Service`, and an unbound service is a defect rather than a failure
        // (so the `catchAll` below would not contain it) — with no space to derive a database from there
        // is nothing to resolve against, so skip them entirely.
        if (!space) {
          return { targets: [] };
        }

        const resolvers = capabilities.getAll(AppCapabilities.NavigationTargetResolver);
        const results = yield* Effect.forEach(resolvers, (resolver) =>
          resolver(query).pipe(Effect.catchAll(() => Effect.succeed([]))),
        ).pipe(Effect.provide(Database.layer(space.db)));

        // Best-first, as the operation's output promises. Sort is stable, so resolvers that declare no
        // position keep contribution order; `position` itself is resolver metadata and not returned.
        // Two resolvers can name the same path (the generic type-section lookup and a type's own
        // resolver), so paths are deduped keeping the best-placed occurrence.
        const seen = new Set<string>();
        return {
          targets: results
            .flat()
            .sort(Position.compare)
            .filter(({ path }) => {
              if (seen.has(path)) {
                return false;
              }
              seen.add(path);
              return true;
            })
            .map(({ path, label, type }) => ({ path, label, type })),
        };
      }),
    ),
  );

export default handler;
