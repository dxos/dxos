//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Client } from '@dxos/client';
import { Identity, Invitation } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';

// #region layer
const client = new Client();
await client.initialize();

// Provides Identity.Service and Space.Service.
const halo = layerClient(client);
// #endregion layer

// #region read
const whoAmI = Effect.gen(function* () {
  const identity = yield* Identity.getSnapshot;
  return Option.map(identity, (identity) => identity.displayName);
});

const watch = Identity.identity.pipe(
  Stream.runForEach((identity) =>
    Effect.sync(() =>
      console.log(
        Option.match(identity, {
          onNone: () => 'no identity yet',
          onSome: (identity) => identity.displayName,
        }),
      ),
    ),
  ),
);
// #endregion read

// #region service
// The synchronous methods, for code outside Effect.
const service = Effect.gen(function* () {
  const identity = yield* Identity.Service;
  const unsubscribe = identity.subscribe((current) =>
    console.log(Option.isSome(current) ? 'signed in' : 'signed out'),
  );
  // An Atom of the same value, for Atom-driven code.
  const atom = Identity.atom(identity);
  return { unsubscribe, atom };
});
// #endregion service

// #region create
const signIn = Effect.gen(function* () {
  const existing = yield* Identity.getSnapshot;
  if (Option.isSome(existing)) {
    return existing.value;
  }
  return yield* Identity.create({ displayName: 'Ada', deviceLabel: 'Laptop' });
});

const rename = Identity.updateProfile({
  displayName: 'Ada Lovelace',
  data: { emoji: '🦊' },
});

// eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
const me = await Effect.runPromise(signIn.pipe(Effect.provide(halo)));
console.log(me.did, me.displayName);
// #endregion create

// #region personal-space
const personalSpace = Effect.gen(function* () {
  const id = yield* Identity.personalSpaceId;
  return Option.getOrUndefined(id);
});
// #endregion personal-space

// #region devices
const listDevices = Effect.gen(function* () {
  const devices = yield* Identity.getDevicesSnapshot;
  for (const device of devices) {
    console.log(device.label ?? device.key, device.kind, device.presence);
  }
});

// The same list, again on every change.
const watchDevices = Identity.devices.pipe(
  Stream.runForEach((devices) =>
    Effect.sync(() => console.log(devices.length, 'devices')),
  ),
);
// #endregion devices

// #region share
const addDevice = Effect.gen(function* () {
  const flow = yield* Identity.share({ authMethod: 'shared-secret' });
  console.log('Open this on the new device:', yield* Invitation.code(flow));
  return flow;
});

declare const invitationCode: string;
const joinIdentity = Identity.join(invitationCode);
// #endregion share

// #region recovery
const backup = Effect.gen(function* () {
  const { recoveryCode } = yield* Identity.createRecoveryCredential();
  console.log('Write this down:', recoveryCode);
});

declare const recoveryCode: string;
const restore = Identity.recover({ recoveryCode });

declare const lookupKey: string;
const revoke = Identity.revokeRecoveryCredential(lookupKey);
// #endregion recovery

// #region challenge
// For a passkey: the challenge the passkey signs before `recover`.
const challenge = Identity.requestRecoveryChallenge;
// #endregion challenge

// #region credentials
const activeRecovery = Effect.gen(function* () {
  const [credentials] = yield* Identity.credentials.pipe(
    Stream.take(1),
    Stream.runCollect,
  );
  return credentials.flatMap((credential) =>
    credential.recovery && !credential.recovery.revoked
      ? [credential.recovery]
      : [],
  );
});
// #endregion credentials

// #region access
const connect = Effect.gen(function* () {
  yield* Identity.grantServiceAccess({
    serverName: 'hub.example.com',
    capabilities: ['compute'],
  });
  return yield* Identity.createApiToken({
    label: 'CI',
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
});

// The identity as EDGE authenticates it, for an HTTP or WebSocket client.
const edgeIdentity = Identity.getEdgeIdentity;
// #endregion access

// #region errors
const safeRename = rename.pipe(
  Effect.catchTag('IdentityError', (error) =>
    Effect.sync(() => console.error('Could not rename:', error.message)),
  ),
);
// #endregion errors

export {
  activeRecovery,
  addDevice,
  backup,
  challenge,
  connect,
  edgeIdentity,
  joinIdentity,
  listDevices,
  personalSpace,
  restore,
  revoke,
  safeRename,
  service,
  watch,
  watchDevices,
  whoAmI,
};
