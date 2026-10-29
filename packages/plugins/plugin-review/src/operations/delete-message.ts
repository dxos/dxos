//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Relation } from '@dxos/echo';
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

      const messages = yield* Effect.promise(() => Thread.loadMessages(thread));
      if (!messages.some(({ id }) => id === message.id)) {
        return {};
      }

      if (messages.length === 1) {
        // TODO(wittjosiah): This doesn't support restoring the thread.
        yield* Operation.invoke(CommentOperation.Delete, { subject, anchor });
        return {};
      }

      const feed = yield* Effect.promise(() => thread.feed.load());
      yield* Feed.remove(feed, [message]).pipe(Effect.provide(Database.layer(db)));

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.message.delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          messageId: message.id,
        },
      });

      return { message };
    }),
  ),
);

export default handler;
