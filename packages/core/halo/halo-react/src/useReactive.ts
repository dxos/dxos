//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { type DependencyList, useEffect, useState } from 'react';

/**
 * Bridges a HALO service snapshot + change {@link Stream.Stream} into React state — the Effect
 * analogue of `useMulticastObservable`. The snapshot is read synchronously for the initial value
 * (no first-render flash); a fiber then pipes the stream into state and is interrupted on unmount
 * or when `deps` change.
 *
 * `snapshot` must be synchronously runnable (an `Effect.sync`/`Effect.succeed`, or an effect made
 * total by the caller); the stream must not fail (`E = never`).
 */
export const useReactive = <A>(snapshot: Effect.Effect<A>, stream: Stream.Stream<A>, deps: DependencyList): A => {
  const [value, setValue] = useState<A>(() => Effect.runSync(snapshot));
  useEffect(() => {
    // Re-seed from the snapshot in case the subscription target changed with `deps`.
    setValue(Effect.runSync(snapshot));
    const fiber = Effect.runFork(Stream.runForEach(stream, (next) => Effect.sync(() => setValue(next))));
    return () => {
      void Effect.runFork(Fiber.interrupt(fiber));
    };
    // The snapshot/stream are rebuilt every render; `deps` is the stable subscription key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
};
