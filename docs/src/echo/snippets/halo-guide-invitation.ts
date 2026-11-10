//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Invitation, Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

declare const spaceId: SpaceId;
declare const flow: Invitation.Flow;

// #region options
const options: Invitation.ShareOptions = {
  authMethod: 'none', // anyone with the code may join
  type: 'delegated', // redeemable while the host is offline
  multiUse: true, // more than one guest
};
const open = Space.share(spaceId, options);
// #endregion options

// #region code
const showCode = Effect.gen(function* () {
  const code = yield* Invitation.code(flow);
  return `https://app.example.com/join?code=${code}`;
});
// #endregion code

// #region events
const follow = Invitation.events(flow).pipe(
  Stream.takeUntil((event) => event._tag === 'success' || event._tag === 'error' || event._tag === 'cancelled'),
  Stream.runForEach((event) =>
    Effect.sync(() => {
      switch (event._tag) {
        case 'readyForAuthentication':
          return console.log('auth code', event.authCode);
        case 'success':
          return console.log('joined space', event.result.spaceId);
        case 'error':
          return console.error(event.message);
      }
    }),
  ),
);
// #endregion events

// #region cancel
const stop = Invitation.cancel(flow);
const pending = Space.invitations(spaceId); // the flows this host has open for the space
// #endregion cancel

export { follow, open, pending, showCode, stop };
