//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { ToggleResolved } from './definitions';

export default ToggleResolved.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const thread = input.thread;

      Obj.change(thread, (t) => {
        if (t.status === 'active' || t.status === undefined) {
          t.status = 'resolved';
        } else if (t.status === 'resolved') {
          t.status = 'active';
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
