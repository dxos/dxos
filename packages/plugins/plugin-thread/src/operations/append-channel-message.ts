//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation } from '../types';
import * as ChannelBackend from '../types/ChannelBackend';

const handler: Operation.WithHandler<typeof ThreadOperation.AppendChannelMessage> =
  ThreadOperation.AppendChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, sender, text }) {
        const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
        const provider = ChannelBackend.resolveProvider(providers, channel.backend.kind);
        invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);

        const message = Message.make({
          sender,
          blocks: [{ _tag: 'text', text }],
        });
        yield* provider.send(channel, message);
      }),
    ),
  );

export default handler;
