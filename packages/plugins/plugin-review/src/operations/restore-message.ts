//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { Message, Thread } from '@dxos/types';

import { CommentOperation } from '#types';

const handler: Operation.WithHandler<typeof CommentOperation.RestoreMessage> = CommentOperation.RestoreMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ anchor, message }) {
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const db = Obj.getDatabase(thread);
      invariant(db, 'Database not found');

      // Re-appended under its own id and `created`, so the thread's send-order sort puts it back where it was.
      const { id, ...fields } = message;
      const feed = yield* Effect.promise(() => thread.feed.load());
      yield* Feed.append(feed, [Obj.make(Message.Message, { id, ...fields })]).pipe(Effect.provide(Database.layer(db)));

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.message.undo-delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          messageId: id,
        },
      });
    }),
  ),
);

export default handler;
