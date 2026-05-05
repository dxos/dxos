//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import * as Operation from '../Operation';
import { Reply } from './index';

export default Reply.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      yield* Console.log('reply', { input });
      return input;
    }),
  ),
);
