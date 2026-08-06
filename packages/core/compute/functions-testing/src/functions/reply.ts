//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Reply } from './definitions';

export default Reply.pipe(
  Operation.withHandler(
    Effect.fn(function* (data) {
      yield* Console.log('reply', { data });
      return data;
    }),
  ),
);
