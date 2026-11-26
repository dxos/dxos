//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.SendToChannel> = ThreadOperation.SendToChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel: channelRef, thread, text }) {
      const channel = yield* Database.load(channelRef);
      const provider = yield* ChannelBackend.findProvider(channel);
      if (provider) {
        return yield* ChannelBackend.sendThrough(provider, channel, thread, text);
      }
      // The backend's plugin runs apart from this one (its own bundle on EDGE), so it posts through its operation.
      const { Send } = ThreadOperation.backendOperations(channel.backend.kind);
      return yield* ChannelBackend.invokeBackend(channel, Send, { channel: channelRef, thread, text });
    }),
  ),
);

export default handler;
