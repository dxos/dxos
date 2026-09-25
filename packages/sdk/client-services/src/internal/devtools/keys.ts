//
// Copyright 2020 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { type KeyringApi } from '@dxos/keyring';
import { type DevtoolsHost } from '@dxos/protocols/rpc';

export const subscribeToKeyringKeys = ({
  keyring,
}: {
  keyring: KeyringApi;
}): EffectStream.Stream<DevtoolsHost.SubscribeToKeyringKeysResponse, Error> =>
  EffectEx.streamFromEmitter<DevtoolsHost.SubscribeToKeyringKeysResponse, Error>((emit) => {
    const ctx = Context.default();
    const update = async () => {
      try {
        emit.single({
          keys: await keyring.list(),
        });
      } catch (err: any) {
        emit.fail(err);
      }
    };
    keyring.keysUpdate.on(ctx, update);
    scheduleTask(ctx, update);

    return Effect.promise(() => ctx.dispose());
  });
