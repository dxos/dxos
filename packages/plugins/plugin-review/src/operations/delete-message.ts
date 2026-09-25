//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { Thread } from '@dxos/types';

import { CommentOperation } from '#types';

const handler: Operation.WithHandler<typeof CommentOperation.DeleteMessage> = CommentOperation.DeleteMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, message }) {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const db = Obj.getDatabase(subject);
      invariant(db, 'Database not found');

      // Match on the reference's own uri, not `ref.target?.id`: `target` reads undefined until the
      // message loads, so an unresolved ref finds nothing and the delete silently no-ops.
      const msgIndex = thread.messages.findIndex((ref) => ref.uri === message.uri);
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
          messageId: msg.id,
        },
      });

      return { message: msg, messageIndex: msgIndex };
    }),
  ),
);

export default handler;
