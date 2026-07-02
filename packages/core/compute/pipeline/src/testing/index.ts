//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Sink } from '../Sink';

/** In-memory sink capturing every emitted value for assertions. */
export type CaptureSink<Out> = {
  readonly sink: Sink<Out, unknown>;
  readonly items: Out[];
};

export const captureSink = <Out>(): CaptureSink<Out> => {
  const items: Out[] = [];
  const sink: Sink<Out, unknown> = (out) =>
    Effect.sync(() => {
      items.push(out);
    });
  return { sink, items };
};

/** A finite source from a fixed list; the pipeline drains and resolves when it ends. */
export const scriptedSource = <T>(items: readonly T[]): Stream.Stream<T> => Stream.fromIterable(items);
