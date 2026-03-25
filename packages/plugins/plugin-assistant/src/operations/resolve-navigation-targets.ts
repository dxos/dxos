//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { ResolveNavigationTargets } from './definitions';

export default ResolveNavigationTargets.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ query }) {
      const capabilities = yield* Capability.Service;

      // Delegate to contributed resolvers.
      const resolvers = capabilities.getAll(AppCapabilities.NavigationTargetResolver);
      const results = yield* Effect.forEach(resolvers, (resolver) =>
        resolver(query).pipe(Effect.catchAll(() => Effect.succeed([]))),
      );
      return { targets: results.flat() };
    }),
  ),
);
