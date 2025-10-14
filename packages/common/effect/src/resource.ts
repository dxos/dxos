//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Lifecycle } from '@dxos/context';

// TODO(dmaretskyi): Extract to effect-utils.
export const accuireReleaseResource = <T extends Lifecycle>(getResource: () => T) =>
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
