//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { sleep } from '@dxos/async';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.Restore> = ThreadOperation.Restore.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread, anchor }) {
      const db = Obj.getDatabase(thread);
      if (!db) {
        return;
      }

      // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
      // 500ms gives React enough time to flush the render triggered by db.add(thread)
      // before db.add(anchor) fires; 100ms was insufficient on slower CI environments.
      db.add(thread);
      yield* Effect.promise(() => sleep(500));
      db.add(anchor);

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.undo-delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
        },
      });
    }),
  ),
);

export default handler;
