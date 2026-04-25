//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/compute';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { ToggleResolved } from './definitions';

const handler: Operation.WithHandler<typeof ToggleResolved> = ToggleResolved.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const thread = input.thread;

      Obj.change(thread, (thread) => {
        if (thread.status === 'active' || thread.status === undefined) {
          thread.status = 'resolved';
        } else if (thread.status === 'resolved') {
          thread.status = 'active';
        }
      });

      const db = Obj.getDatabase(thread);
      invariant(db, 'Database not found');

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.toggle-resolved',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
        },
      });
    }),
  ),
);

export default handler;
