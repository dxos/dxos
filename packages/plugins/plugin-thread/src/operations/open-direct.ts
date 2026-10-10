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
      const person = yield* Database.load(personRef);
      const provider = yield* ChannelBackend.getProvider(channel);
      const openDirect = yield* ChannelBackend.requireMember(provider, 'openDirect');
      // As with sending, a backend refusal is an outcome the caller relays.
      return yield* openDirect(channel, person).pipe(
        Effect.map((thread) =>
          thread === undefined
            ? { reason: `The person has no ${provider.label} handle the channel can reach.` }
            : { thread },
        ),
        Effect.catch((error) => Effect.succeed({ reason: error.message })),
      );
    }),
  ),
);

export default handler;
