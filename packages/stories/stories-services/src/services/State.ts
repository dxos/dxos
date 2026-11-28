//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';

import type * as Service from './Service.ts';

/** A provider's reactive value: the `Property` its contract exposes, and the setter the provider keeps. */
export interface Cell<A> {
  readonly property: Service.Property<A>;
  get(): A;
  set(value: A): void;
}

/** A value held in the provider's memory for as long as its scope lasts. */
export const cell = <A>(initial: A): Cell<A> => {
  let value = initial;
  const listeners = new Set<(value: A) => void>();
  return {
    property: {
      get: Effect.sync(() => value),
      changes: Stream.callback<A>(
        Effect.fnUntraced(function* (queue: Queue.Queue<A, Cause.Done>) {
          const listener = (next: A) => {
            Queue.offerUnsafe(queue, next);
          };
          Queue.offerUnsafe(queue, value);
          listeners.add(listener);
          yield* Effect.addFinalizer(() => Effect.sync(() => listeners.delete(listener)));
        }),
      ),
    },
    get: () => value,
    set: (next) => {
      value = next;
      listeners.forEach((listener) => listener(next));
    },
  };
};

/** A provider's event: the stream its contract exposes, and the emitter the provider keeps. */
export interface Emitter<A> {
  readonly stream: Stream.Stream<A>;
  emit(value: A): void;
}

export const emitter = <A>(): Emitter<A> => {
  const listeners = new Set<(value: A) => void>();
  return {
    stream: Stream.callback<A>(
      Effect.fnUntraced(function* (queue: Queue.Queue<A, Cause.Done>) {
        const listener = (value: A) => {
          Queue.offerUnsafe(queue, value);
        };
        listeners.add(listener);
        yield* Effect.addFinalizer(() => Effect.sync(() => listeners.delete(listener)));
      }),
    ),
    emit: (value) => listeners.forEach((listener) => listener(value)),
  };
};
