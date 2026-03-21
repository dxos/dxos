//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';

import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Thread } from '@dxos/types';

import { CreateChannelThread } from './definitions';

export default CreateChannelThread.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => {
      const thread = Thread.make({ status: 'active' });
      const threadRef = Ref.make(thread);
      Obj.change(input.channel, (c) => {
        c.threads.push(threadRef);
      });
      return { object: thread };
    }),
  ),
);
