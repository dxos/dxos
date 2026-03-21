//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';

import { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { Thread } from '@dxos/types';

import { Delete, DeleteMessage } from './definitions';

export default DeleteMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, messageId }) {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const db = Obj.getDatabase(subject);
      invariant(db, 'Database not found');

      const msgIndex = thread.messages.findIndex((ref) => ref.target?.id === messageId);
      const msg = thread.messages[msgIndex]?.target;
      if (!msg) {
        return { messageIndex: -1 };
      }

      if (msgIndex === 0 && thread.messages.length === 1) {
        // TODO(wittjosiah): This doesn't support restoring the thread.
        yield* Operation.invoke(Delete, { subject, anchor });
        return { messageIndex: -1 };
      }

      Obj.change(thread, (t) => {
        t.messages.splice(msgIndex, 1);
      });

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.message.delete',
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
