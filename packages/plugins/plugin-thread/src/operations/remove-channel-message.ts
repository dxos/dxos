//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';

import { ThreadCapabilities, ThreadOperation, resolveProvider } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.RemoveChannelMessage> =
  ThreadOperation.RemoveChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, message }) {
        const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
        const provider = resolveProvider(providers, channel.backend.kind);
        invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
        invariant(provider.remove, `Channel backend cannot remove messages: ${channel.backend.kind}`);

        yield* provider.remove(channel, message);
      }),
    ),
  );

export default handler;
