//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { Thread } from '@dxos/types';

import { RestoreMessage } from './definitions';

const handler: Operation.WithHandler<typeof RestoreMessage> = RestoreMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ anchor, message, messageIndex }) {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const db = Obj.getDatabase(thread);
      invariant(db, 'Database not found');

      Obj.change(thread, (t) => {
        t.messages.splice(messageIndex, 0, Ref.make(message));
      });

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.message.undo-delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          messageId: message.id,
        },
      });
    }),
  ),
);

export default handler;
