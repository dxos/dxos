//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Invitation, Space } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';
import { type IdentityDid, type SpaceId } from '@dxos/keys';

declare const ada: Client;
declare const grace: Client;
declare const spaceId: SpaceId; // the tutorial app's space

// #region share
const invite = Effect.gen(function* () {
  const flow = yield* Space.share(spaceId, { authMethod: 'shared-secret' });
  const code = yield* Invitation.code(flow);
  console.log('Send this to Grace:', code);

  yield* Invitation.events(flow).pipe(
    Stream.takeUntil((event) => event._tag === 'success' || event._tag === 'error' || event._tag === 'cancelled'),
    Stream.runForEach((event) =>
      Effect.sync(() => {
        if (event._tag === 'readyForAuthentication') {
          console.log('Tell Grace this code:', event.authCode);
        }
      }),
    ),
  );
});
// #endregion share

declare const code: string;
declare const authCode: string;

// #region join
const accept = Effect.gen(function* () {
  const flow = yield* Space.join(code);
  yield* Invitation.events(flow).pipe(
    Stream.takeUntil((event) => event._tag === 'success' || event._tag === 'error' || event._tag === 'cancelled'),
    Stream.runForEach((event) => {
      console.log(event._tag); // connecting, connected, readyForAuthentication, authenticating, success
      return event._tag === 'readyForAuthentication' ? Invitation.authenticate(flow, authCode) : Effect.void;
    }),
  );
});
// #endregion join

declare const graceDid: IdentityDid;

// #region members
const manage = Effect.gen(function* () {
  const [members] = yield* Space.members(spaceId).pipe(Stream.take(1), Stream.runCollect);
  for (const member of members) {
    console.log(member.displayName, member.role, member.online ? 'online' : 'offline');
  }

  yield* Space.updateMemberRole(spaceId, graceDid, 'read');
});
// #endregion members

// #region remove
const remove = Space.removeMember(spaceId, graceDid);
// #endregion remove

await EffectEx.runPromise(invite.pipe(Effect.provide(layerClient(ada))));
await EffectEx.runPromise(accept.pipe(Effect.provide(layerClient(grace))));
await EffectEx.runPromise(manage.pipe(Effect.provide(layerClient(ada))));
await EffectEx.runPromise(remove.pipe(Effect.provide(layerClient(ada))));
