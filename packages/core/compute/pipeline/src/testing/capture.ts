//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Pipeline from '../Pipeline';

/** In-memory sink capturing every emitted value for assertions. */
export type CaptureSink<Out> = {
  readonly sink: Pipeline.Sink<Out, unknown>;
  readonly items: Out[];
};

export const captureSink = <Out>(): CaptureSink<Out> => {
  const items: Out[] = [];
  const sink: Pipeline.Sink<Out, unknown> = (out) =>
    Effect.sync(() => {
      items.push(out);
    });
  return { sink, items };
};
