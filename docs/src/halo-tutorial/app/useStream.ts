//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import type * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { useEffect, useState } from 'react';

import { type Halo } from '../client.ts';

/**
 * The latest value `stream` emits, run against `halo`; undefined until the
 * first. Pass a stream that keeps its identity between renders.
 */
export const useStream = <A, E>(
  halo: Layer.Layer<Halo>,
  stream: Stream.Stream<A, E, Halo> | undefined,
): A | undefined => useStreamResult(halo, stream)[0];

/** {@link useStream}'s value, and whether the stream has emitted yet. */
export const useStreamResult = <A, E>(
  halo: Layer.Layer<Halo>,
  stream: Stream.Stream<A, E, Halo> | undefined,
): [value: A | undefined, emitted: boolean] => {
  const [state, setState] = useState<{ value?: A; emitted: boolean }>({
    emitted: false,
  });
  useEffect(() => {
    setState({ emitted: false });
    if (!stream) {
      return;
    }
    const fiber = Effect.runFork(
      stream.pipe(
        Stream.runForEach((value) =>
          Effect.sync(() => setState({ value, emitted: true })),
        ),
        Effect.provide(halo),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [halo, stream]);
  return [state.value, state.emitted];
};
