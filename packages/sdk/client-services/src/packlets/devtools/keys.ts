//
// Copyright 2020 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type KeyringApi } from '@dxos/keyring';
import { type SubscribeToKeyringKeysResponse } from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToKeyringKeys = ({ keyring }: { keyring: KeyringApi }) =>
  new Stream<SubscribeToKeyringKeysResponse>(({ next, ctx }) => {
    const update = async () => {
      next({
        keys: await keyring.list(),
      });
    };
    keyring.keysUpdate.on(ctx, update);
    scheduleTask(ctx, update);
  });
