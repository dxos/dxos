//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { ToggleResolved } from './definitions';

const handler: Operation.WithHandler<typeof ToggleResolved> = ToggleResolved.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const thread = input.thread;

      Obj.change(thread, (obj) => {
        if (obj.status === 'active' || obj.status === undefined) {
          obj.status = 'resolved';
        } else if (obj.status === 'resolved') {
          obj.status = 'active';
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
