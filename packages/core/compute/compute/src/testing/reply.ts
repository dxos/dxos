//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import * as Operation from '../Operation.ts';
import { Reply } from './definitions.ts';

export default Reply.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      yield* Console.log('reply', { input });
      return input;
    }),
  ),
);
