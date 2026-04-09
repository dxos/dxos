//
// Copyright 2025 DXOS.org
//

// Operation handler that mutates an existing ECHO object.
// ECHO objects are reactive — direct property assignment triggers replication
// to other peers and re-renders in the UI.

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { UpdateStatus } from './definitions';

const handler: Operation.WithHandler<typeof UpdateStatus> = UpdateStatus.pipe(
  Operation.withHandler(({ item, status }) =>
    // `Effect.sync` wraps a synchronous side-effect. For async work, use `Effect.promise`.
    // `Obj.change` provides a mutable draft for safe property assignment on ECHO objects.
    Effect.sync(() => {
      Obj.change(item, (draft) => {
        draft.status = status;
      });
    }),
  ),
);

export default handler;
