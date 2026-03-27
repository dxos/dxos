//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Thread } from '@dxos/types';

import { CreateChannelThread } from './definitions';

const handler: Operation.WithHandler<typeof CreateChannelThread> = CreateChannelThread.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => {
      const thread = Thread.make({ status: 'active' });
      const threadRef = Ref.make(thread);
      Obj.change(input.channel, (obj) => {
        obj.threads.push(threadRef);
      });
      return { object: thread };
    }),
  ),
);

export default handler;
