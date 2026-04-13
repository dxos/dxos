//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

export const toolkit = Toolkit.make(
  Tool.make('time', {
    description: 'Gets the current time.',
    parameters: {},
    success: Schema.String.annotations({
      description: 'The current time in ISO format.',
    }),
    failure: Schema.Never,
    dependencies: [],
  }),
);

export const layer = toolkit.toLayer({
  time: Effect.fn(function* () {
    return new Date().toISOString();
  }),
}) satisfies Layer.Layer<Tool.Handler<'time'>>;

const Random = Operation.make({
  meta: {
    key: 'example.com/function/random',
    name: 'random',
    description: 'Gets a random number.',
  },
  input: Schema.Void,
  output: Schema.Struct({
    value: Schema.String,
  }),
});

const random = Random.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return {
        value: Math.floor(Math.random() * 10).toString(),
      };
    }),
  ),
);

export const functions = [random];
