//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { ThreadAnnotation, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateThread> = ThreadOperation.CreateThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ message }) {
      // Marking the message is the whole write: the annotation travels with it through the feed
      // codec, so a thread needs no item of its own and no round trip through the backend provider.
      ThreadAnnotation.create(message);
    }),
  ),
);

export default handler;
