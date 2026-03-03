//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

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

const random = defineFunction({
  key: 'example.com/function/random',
  name: 'random',
  description: 'Gets a random number.',
  // TODO(burdon): Change type to parameters, success, failure.
  inputSchema: Schema.Void,
  outputSchema: Schema.Struct({
    value: Schema.String,
  }),
  handler: Effect.fn(function* () {
    return {
      value: Math.floor(Math.random() * 10).toString(),
    };
  }),
});

export const functions = [random];
