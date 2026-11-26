//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.OpenDirect> = ThreadOperation.OpenDirect.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel: channelRef, person: personRef }) {
      const channel = yield* Database.load(channelRef);
      const provider = yield* ChannelBackend.findProvider(channel);
      if (provider) {
        return yield* ChannelBackend.openDirectThrough(provider, channel, yield* Database.load(personRef));
      }
      // As with sending: the backend's plugin runs apart from this one, so it opens the conversation itself.
      const { OpenDirect } = ThreadOperation.backendOperations(channel.backend.kind);
      return yield* ChannelBackend.invokeBackend(channel, OpenDirect, { channel: channelRef, person: personRef });
    }),
  ),
);

export default handler;
