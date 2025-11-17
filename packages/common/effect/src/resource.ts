//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Scope from 'effect/Scope';

import type { Lifecycle } from '@dxos/context';

/**
 * Acquires a resource and releases it when the scope is closed.
 */
export const acquireReleaseResource = <T extends Lifecycle>(
  getResource: () => T,
): Effect.Effect<T, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const resource = getResource();
      yield* Effect.promise(async () => {
        resource.open?.();
        return undefined;
      });
      return resource;
    }),
    (resource) =>
      Effect.promise(async () => {
        resource.close?.();
        return undefined;
      }),
  );
