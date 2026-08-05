//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, resolveProvider } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.AppendChannelMessage> =
  ThreadOperation.AppendChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, sender, text, threadId, parentMessage }) {
        const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
        const provider = resolveProvider(providers, channel.backend.kind);
        invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);

        const message = Message.make({
          sender,
          blocks: [{ _tag: 'text', text }],
          ...(threadId ? { threadId } : {}),
          ...(parentMessage ? { parentMessage: Ref.make(parentMessage) } : {}),
        });
        yield* provider.send(channel, message);
      }),
    ),
  );

export default handler;
