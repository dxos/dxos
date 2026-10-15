//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ChannelBackend, ThreadOperation } from '#types';

const handler: Operation.WithHandler<typeof ThreadOperation.DeleteThread> = ThreadOperation.DeleteThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel: channelRef, thread }) {
      const channel = yield* Database.load(channelRef);
      const provider = yield* ChannelBackend.getProvider(channel);
      const threads = yield* ChannelBackend.requireMember(provider, 'threads');
      if (!threads.remove) {
        return { deleted: false, reason: `The ${provider.label} channel backend cannot delete threads.` };
      }

      // A backend refusal (missing permission, an unknown thread) is an outcome the caller shows, not a failure.
      return yield* threads.remove(channel, thread).pipe(
        Effect.as({ deleted: true }),
        Effect.catch((error) => Effect.succeed({ deleted: false, reason: error.message })),
      );
    }),
  ),
);

export default handler;
