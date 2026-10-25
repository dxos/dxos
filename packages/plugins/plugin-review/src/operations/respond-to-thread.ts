//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { Thread } from '@dxos/types';

import { CommentOperation } from '#types';

const handler: Operation.WithHandler<typeof CommentOperation.RespondToThread> = CommentOperation.RespondToThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread: threadRef, subject: subjectRef, messageId }) {
      const [runner] = yield* Capability.getAll(AppCapabilities.CommentAgentRunner);
      if (!runner) {
        return;
      }
      const thread = yield* Database.load(threadRef);
      const subject = yield* Database.load(subjectRef);
      const messages = yield* Effect.promise(() => Thread.loadMessages(thread));
      const message = messages.find(({ id }) => id === messageId);
      if (!message) {
        log.warn('comment-thread agent: triggering message not found', { threadId: thread.id, messageId });
        return;
      }

      yield* runner.run({ thread, subject, message }).pipe(
        // The user's message is already in the thread, so a failed turn only reports itself.
        Effect.catch((error) =>
          Effect.gen(function* () {
            log.warn('comment-thread agent failed', { threadId: thread.id, error });
            const db = Obj.getDatabase(thread);
            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
              name: 'comments.agent.failed',
              properties: {
                spaceId: db?.spaceId,
                threadId: thread.id,
              },
            });
          }),
        ),
      );
    }),
  ),
);

export default handler;
