//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { batch as batchEvents } from '@dxos/echo/Obj';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.Restore> = ThreadOperation.Restore.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread, anchor }) {
      const db = Obj.getDatabase(thread);
      if (!db) {
        return;
      }

      // Batch both additions so a single reactive notification fires after both objects
      // are in the database. Previously a sleep(100) separated the two calls to prevent
      // a crash in Relation.setSource(anchor) during an intermediate render — batching
      // eliminates the intermediate render entirely without any artificial delay.
      batchEvents(() => {
        db.add(thread);
        db.add(anchor);
      });

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
