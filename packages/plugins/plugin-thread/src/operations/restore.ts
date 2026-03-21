//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { sleep } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { Restore } from './definitions';

export default Restore.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread, anchor }) {
      const db = Obj.getDatabase(thread);
      if (!db) {
        return;
      }

      // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
      db.add(thread);
      yield* Effect.promise(() => sleep(100));
      db.add(anchor);

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.undo-delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
        },
      });
    }),
  ),
);
