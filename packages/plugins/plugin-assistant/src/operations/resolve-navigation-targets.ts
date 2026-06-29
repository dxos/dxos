//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, EID } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.ResolveNavigationTargets> =
  AssistantOperation.ResolveNavigationTargets.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ query }) {
        const capabilities = yield* Capability.Service;
        const client = yield* Capability.get(ClientCapabilities.Client).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        );

        // Object resolvers read the space database to derive a navigation path, but the agent tool
        // runtime does not bind Database.Service. Derive it from the queried object URI's space (or
        // the active space for space-less URIs) so resolution works for object URIs.
        const eid = query?.uri ? EID.tryParse(query.uri) : undefined;
        const spaceId = eid ? EID.getSpaceId(eid) : undefined;
        const space = client
          ? ((spaceId ? client.spaces.get(spaceId) : undefined) ?? AppSpace.getActiveSpace(client, capabilities))
          : undefined;

        // Delegate to contributed resolvers.
        const resolvers = capabilities.getAll(AppCapabilities.NavigationTargetResolver);
        const resolve = Effect.forEach(resolvers, (resolver) =>
          resolver(query).pipe(Effect.catchAll(() => Effect.succeed([]))),
        );
        const results = yield* space ? resolve.pipe(Effect.provide(Database.layer(space.db))) : resolve;
        return { targets: results.flat() };
      }),
    ),
  );

export default handler;
