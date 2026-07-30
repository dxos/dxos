//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { ThreadAnnotation, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.SetThreadName> = ThreadOperation.SetThreadName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ message, name }) {
      ThreadAnnotation.setName(message, name);
    }),
  ),
);

export default handler;
