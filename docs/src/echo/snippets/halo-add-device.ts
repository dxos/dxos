//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Identity, Invitation } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';

declare const laptop: Client; // has the identity
declare const phone: Client; // a fresh device

// #region share
const host = Effect.gen(function* () {
  const flow = yield* Identity.share({ authMethod: 'shared-secret' });
  const code = yield* Invitation.code(flow);
  console.log('Open this on the new device:', code);

  // Show the authorization code when the guest connects.
  yield* Invitation.events(flow).pipe(
    Stream.takeUntil((event) => event._tag === 'success' || event._tag === 'error' || event._tag === 'cancelled'),
    Stream.runForEach((event) =>
      Effect.sync(() => {
        if (event._tag === 'readyForAuthentication' && event.authCode) {
          console.log('Enter this code on the new device:', event.authCode);
        }
      }),
    ),
  );
});
// #endregion share

declare const invitationCode: string;
declare const authCode: string;

// #region join
const guest = Effect.gen(function* () {
  const flow = yield* Identity.join(invitationCode);
  yield* Invitation.events(flow).pipe(
    Stream.filter((event) => event._tag === 'readyForAuthentication'),
    Stream.take(1),
    Stream.runDrain,
  );
  yield* Invitation.authenticate(flow, authCode);
});
// #endregion join

// #region devices
const listDevices = Effect.gen(function* () {
  const devices = yield* Identity.getDevicesSnapshot;
  for (const device of devices) {
    console.log(device.label ?? device.key, device.kind, device.presence, device.current ? '(this device)' : '');
  }
});
// #endregion devices

await EffectEx.runPromise(host.pipe(Effect.provide(layerClient(laptop))));
await EffectEx.runPromise(guest.pipe(Effect.provide(layerClient(phone))));
await EffectEx.runPromise(listDevices.pipe(Effect.provide(layerClient(phone))));
