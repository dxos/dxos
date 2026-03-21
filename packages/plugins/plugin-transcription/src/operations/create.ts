//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { Transcript } from '@dxos/types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ space }) {
      return {
        object: Transcript.make(space.queues.create().dxn),
      };
    }),
  ),
);

export default handler;
