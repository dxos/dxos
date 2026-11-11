//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Identity } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';

declare const laptop: Client;
declare const newLaptop: Client;

// #region create
const backup = Effect.gen(function* () {
  const { recoveryCode } = yield* Identity.createRecoveryCredential();
  console.log('Write this down and keep it safe:', recoveryCode);
});
// #endregion create

declare const recoveryCode: string;

// #region recover
const restore = Effect.gen(function* () {
  const identity = yield* Identity.recover({ recoveryCode });
  console.log('Welcome back,', identity.displayName);
});
// #endregion recover

// #region revoke
const revokeAll = Effect.gen(function* () {
  const [credentials] = yield* Identity.credentials.pipe(
    Stream.take(1),
    Stream.runCollect,
  );
  for (const credential of credentials) {
    const recovery = credential.recovery;
    if (recovery && !recovery.revoked && recovery.lookupKey) {
      yield* Identity.revokeRecoveryCredential(recovery.lookupKey);
    }
  }
});
// #endregion revoke

await EffectEx.runPromise(backup.pipe(Effect.provide(layerClient(laptop))));
await EffectEx.runPromise(restore.pipe(Effect.provide(layerClient(newLaptop))));
await EffectEx.runPromise(
  revokeAll.pipe(Effect.provide(layerClient(newLaptop))),
);
