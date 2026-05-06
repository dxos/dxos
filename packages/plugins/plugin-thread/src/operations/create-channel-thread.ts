//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Thread } from '@dxos/types';

import { CreateChannelThread } from './definitions';

const handler: Operation.WithHandler<typeof CreateChannelThread> = CreateChannelThread.pipe(
  Operation.withHandler((_input) =>
    Effect.sync(() => {
      // The channel input is preserved for callers (e.g. plugin-meeting) so they can pass
      // their channel context, but the new feed-backed Channel does not store threads in
      // an array — consumers hold the returned Thread directly (see Meeting.thread).
      const thread = Thread.make({ status: 'active' });
      return { object: thread };
    }),
  ),
);

export default handler;
