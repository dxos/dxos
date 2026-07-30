//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppSpace, NavigationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, EID } from '@dxos/echo';

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
        // client: it is the only place that can turn a URI's space id into a database to provide.
        const eid = query?.uri ? EID.tryParse(query.uri) : undefined;
        const spaceId = eid ? EID.getSpaceId(eid) : undefined;
        const space = client
          ? ((spaceId ? client.spaces.get(spaceId) : undefined) ?? AppSpace.getActiveSpace(client, capabilities))
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

        return { targets: NavigationOperation.orderTargets(results.flat()) };
      }),
    ),
  );

export default handler;
