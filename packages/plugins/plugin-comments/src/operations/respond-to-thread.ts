//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { ThreadCapabilities, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.RespondToThread> = ThreadOperation.RespondToThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread: threadRef, subject: subjectRef }) {
      const runner = yield* Capability.get(ThreadCapabilities.AgentRunner);
      const thread = yield* Database.load(threadRef);
      const subject = yield* Database.load(subjectRef);

      yield* runner.run({ thread, subject }).pipe(
        // Runner errors are caught here so the user's message remains in the
        // thread (no assistant message is appended) and an observability event
        // is emitted for diagnostics.
        Effect.catchAll((error) =>
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
