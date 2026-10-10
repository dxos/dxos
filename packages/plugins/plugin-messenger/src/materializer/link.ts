//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';
import { type Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { MessengerError } from '#types';

/**
 * Loads the object a notification links to. The link names the sender's space, which may be closed
 * on this device, so that space is opened first; the ref itself resolves across spaces once it is.
 */
export const loadLink = Effect.fn('Messenger.loadLink')(function* (client: Client, ref: Ref.Ref<Obj.Unknown>) {
  const spaceId = EID.isEID(ref.uri) ? EID.getSpaceId(ref.uri) : undefined;
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
  if (space && space.state.get() !== SpaceState.SPACE_READY) {
    if (space.state.get() === SpaceState.SPACE_INACTIVE) {
      yield* Effect.tryPromise({
        try: () => space.open(),
        catch: (error) => new MessengerError.LinkUnavailableError({ cause: error, context: { uri: ref.uri } }),
      });
    }
    yield* Effect.promise(() => space.waitUntilReady());
  }

  return yield* Effect.tryPromise({
    try: () => ref.load(),
    catch: (error) => new MessengerError.LinkUnavailableError({ cause: error, context: { uri: ref.uri } }),
  });
});
