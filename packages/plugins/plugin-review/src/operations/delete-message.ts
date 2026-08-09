//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { Thread } from '@dxos/types';

import * as CommentOperation from '../types/CommentOperation';

const handler: Operation.WithHandler<typeof CommentOperation.DeleteMessage> = CommentOperation.DeleteMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, messageId }) {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const db = Obj.getDatabase(subject);
      invariant(db, 'Database not found');

      // Match on the reference's own id, not `ref.target?.id`: `target` reads undefined until the
      // message object is loaded, so an unresolved ref made this find nothing and return quietly —
      // the delete no-opped and the thread outlived its last message (comments e2e, 1 in 8).
      const msgIndex = thread.messages.findIndex(Ref.hasEntityId(messageId));
      if (msgIndex === -1) {
        return { messageIndex: -1 };
      }
      const msg = yield* Effect.promise(() => thread.messages[msgIndex].load());

      if (msgIndex === 0 && thread.messages.length === 1) {
        // TODO(wittjosiah): This doesn't support restoring the thread.
        yield* Operation.invoke(CommentOperation.Delete, { subject, anchor });
        return { messageIndex: -1 };
      }

      Obj.update(thread, (thread) => {
        thread.messages.splice(msgIndex, 1);
      });

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.message.delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          threadLength: thread.messages.length,
          messageId,
        },
      });

      return { message: msg, messageIndex: msgIndex };
    }),
  ),
);

export default handler;
