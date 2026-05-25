//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import { ThreadCapabilities, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.RespondToThread> = ThreadOperation.RespondToThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread: threadRef, subject: subjectRef }) {
      const runner = yield* Capability.get(ThreadCapabilities.AgentRunner);
      const thread = yield* Database.load(threadRef);
      const subject = yield* Database.load(subjectRef);

      yield* runner.run({ thread, subject }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            log.warn('comment-thread agent failed', { threadId: thread.id, error });
          }),
        ),
      );
    }),
  ),
);

export default handler;
