//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.SetThreadName> = ThreadOperation.SetThreadName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread, name }) {
      // The thread is an object of its own, so naming one rewrites nothing but the thread — the feed
      // re-appends it whole, and only the name is at stake if two participants rename at once.
      Obj.update(thread, (thread) => {
        thread.name = name?.length ? name : undefined;
      });
    }),
  ),
);

export default handler;
