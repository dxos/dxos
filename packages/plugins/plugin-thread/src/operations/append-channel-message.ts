//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Message } from '@dxos/types';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.AppendChannelMessage> =
  ThreadOperation.AppendChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, sender, text }) {
        const provider = yield* ChannelBackend.getProvider(channel);

        const message = Message.make({
          sender,
          blocks: [{ _tag: 'text', text }],
        });
        yield* provider.send(channel, message);
      }),
    ),
  );

export default handler;
