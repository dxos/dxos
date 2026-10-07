//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

/**
 * Push-side handle given to a {@link streamFromEmitter} registration.
 */
export type Emitter<A, E> = {
  /** Emit one value. */
  single(value: A): void;
  /** Terminate the stream with an error. */
  fail(error: E): void;
  /** Terminate the stream normally. */
  end(): void;
};

/**
 * Builds a stream from a push-based source that is registered once and cancelled on termination.
 *
 * Effect 4 replaced the emitter-shaped `Stream.async` with the queue-shaped `Stream.callback`; the
 * repo's callback sources (observables, protobuf service streams, event emitters) are all push-once
 * registrations, which this expresses without threading a `Queue` through each one.
 *
 * @param register Subscribes the source; the returned effect is run when the stream terminates.
 */
export const streamFromEmitter = <A, E = never, R = never>(
  register: (emit: Emitter<A, E>) => Effect.Effect<unknown, never, R> | void,
  options?: {
    readonly bufferSize?: number | undefined;
    readonly strategy?: 'sliding' | 'dropping' | 'suspend' | undefined;
  },
): Stream.Stream<A, E, Exclude<R, Scope.Scope>> =>
  Stream.callback<A, E, R | Scope.Scope>(
    (queue) =>
      Effect.suspend(() => {
        const cleanup = register({
          single: (value) => void Queue.offerUnsafe(queue, value),
          fail: (error) => void Queue.failCauseUnsafe(queue, Cause.fail(error)),
          end: () => void Queue.endUnsafe(queue),
        });
        return cleanup ? Effect.addFinalizer(() => Effect.asVoid(cleanup)) : Effect.void;
      }),
    options,
  );
