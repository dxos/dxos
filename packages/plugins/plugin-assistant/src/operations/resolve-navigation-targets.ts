//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { DXN as _DXN } from '@dxos/keys'; // keep type emit portable for ResolveNavigationTargets's inferred DXN.Schema field.

import { AssistantOperation } from '#types';

export default AssistantOperation.ResolveNavigationTargets.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ query }) {
      const capabilities = yield* Capability.Service;

      // Delegate to contributed resolvers.
      const resolvers = capabilities.getAll(AppCapabilities.NavigationTargetResolver);
      const results = yield* Effect.forEach(resolvers, (resolver) =>
        resolver(query as AppCapabilities.NavigationQuery).pipe(Effect.catchAll(() => Effect.succeed([]))),
      );
      return { targets: results.flat() };
    }),
  ),
);
