//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { type Thread } from '@dxos/types';

import { CommentOperation } from '../types';

const handler: Operation.WithHandler<typeof CommentOperation.SetAgentConfig> = CommentOperation.SetAgentConfig.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread: threadRef, config }) {
      const thread = yield* Database.load(threadRef);
      Obj.update(thread, (thread) => {
        (thread as Obj.Mutable<Thread.Thread>).agent = config;
      });
    }),
  ),
);

export default handler;
