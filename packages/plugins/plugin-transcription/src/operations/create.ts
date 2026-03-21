//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { Transcript } from '@dxos/types';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ space }) {
      return {
        object: Transcript.make(space.queues.create().dxn),
      };
    }),
  ),
);
