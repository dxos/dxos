//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
// Value-side `DXN` re-export keeps the inferred `default` export's `.d.ts` portable —
// `AssistantOperation.ResolveNavigationTargets` references `DXN.Schema` and the emitter
// would otherwise emit an unresolvable type-only reference.
import { DXN as _DXNReference } from '@dxos/keys';
export { _DXNReference };

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
