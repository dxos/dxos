//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Message } from '@dxos/types';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.SendToChannel> = ThreadOperation.SendToChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel: channelRef, thread, text }) {
      const channel = yield* Database.load(channelRef);
      const provider = yield* ChannelBackend.getProvider(channel);
      const message = Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }] });
      const send =
        thread === undefined
          ? provider.send(channel, message)
          : (yield* ChannelBackend.requireMember(provider, 'threads')).send(channel, thread, message);

      // A backend refusal (closed DMs, missing permission) is an outcome the caller relays, not a failure.
      return yield* send.pipe(
        Effect.map((result) => ({ delivered: true, ...ChannelBackend.toReceipt(result) })),
        Effect.catch((error) => Effect.succeed({ delivered: false, reason: error.message })),
      );
    }),
  ),
);

export default handler;
