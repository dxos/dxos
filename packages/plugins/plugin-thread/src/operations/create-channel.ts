//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Channel } from '@dxos/types';

import { ChannelBackend, ThreadCapabilities, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateChannel> = ThreadOperation.CreateChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, kind, options }) {
      // Filed in the space: a caller outside this process can only hand the channel back by reference, and a
      // channel nobody persisted has no database for its backend to write the messages to.
      if (!kind || kind === Channel.FeedBackendKind) {
        return { object: yield* Database.add(Channel.make({ name })) };
      }

      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = ChannelBackend.resolveProvider(providers, kind);
      invariant(provider, `No channel backend for kind: ${kind}`);
      const config = provider.makeConfig(options ?? {});
      return { object: yield* Database.add(Channel.make({ name, backend: { kind, config } })) };
    }),
  ),
);

export default handler;
