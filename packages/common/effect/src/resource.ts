import { Effect } from 'effect';
import type { Lifecycle } from '@dxos/context';

// TODO(dmaretskyi): Extract to effect-utils.
export const accuireReleaseResource = <T extends Lifecycle>(getResource: () => T) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const resource = getResource();
      yield* Effect.promise(async () => void resource.open?.());
      return resource;
    }),
    (resource) => Effect.promise(async () => void resource.close?.()),
  );
