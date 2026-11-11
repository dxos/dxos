//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Client } from '@dxos/client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Identity } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';

// #region layer
const client = new Client();
await client.initialize();

const halo = layerClient(client); // provides Identity.Service and Space.Service
// #endregion layer

// #region create
const signIn = Effect.gen(function* () {
  const existing = yield* Identity.getSnapshot;
  if (Option.isSome(existing)) {
    return existing.value;
  }
  return yield* Identity.create({ displayName: 'Ada' });
});

const me = await EffectEx.runPromise(signIn.pipe(Effect.provide(halo)));
console.log(me.did, me.displayName);
// #endregion create

// #region follow
const watch = Identity.identity.pipe(
  Stream.runForEach((identity) =>
    Effect.sync(() =>
      console.log(
        Option.match(identity, {
          onNone: () => 'signed out',
          onSome: (i) => i.displayName,
        }),
      ),
    ),
  ),
);
// #endregion follow

// #region rename
const rename = Identity.updateProfile({ displayName: 'Ada Lovelace' });
await EffectEx.runPromise(rename.pipe(Effect.provide(halo)));
// #endregion rename

export { watch };
