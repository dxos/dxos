//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';
import { Fibonacci } from './definitions';

export default Fibonacci.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ iterations = 100_000 }) {
      let a = 0n;
      let b = 1n;
      for (let i = 0; i < iterations; i++) {
        a += b;
        b = a - b;
      }
      return { result: a.toString() };
    }),
  ),
);
