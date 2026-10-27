//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.GetChannelStatus> = ThreadOperation.GetChannelStatus.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel: channelRef }) {
      const channel = yield* Database.load(channelRef);
      const provider = yield* ChannelBackend.getProvider(channel);
      const connection = yield* ChannelBackend.requireMember(provider, 'connection');
      return { status: yield* connection.status(channel) };
    }),
  ),
);

export default handler;
