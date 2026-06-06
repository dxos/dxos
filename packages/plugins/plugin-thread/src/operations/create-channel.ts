//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { Channel } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, resolveProvider } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateChannel> = ThreadOperation.CreateChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, kind, options }) {
      if (!kind || kind === Channel.FeedBackendKind) {
        return { object: Channel.make({ name }) };
      }

      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, kind);
      invariant(provider, `No channel backend for kind: ${kind}`);
      const config = provider.makeConfig(options ?? {});
      return { object: Channel.make({ name, backend: { kind, config } }) };
    }),
  ),
);

export default handler;
