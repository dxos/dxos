//
// Copyright 2020 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Keyring } from '@dxos/keyring';
import { create } from '@dxos/protocols/buf';
import {
  type SubscribeToKeyringKeysResponse,
  SubscribeToKeyringKeysResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';

export const subscribeToKeyringKeys = ({ keyring }: { keyring: Keyring }) =>
  new Stream<SubscribeToKeyringKeysResponse>(({ next, ctx }) => {
    const update = async () => {
      const keys = await keyring.list();
      next(
        create(SubscribeToKeyringKeysResponseSchema, {
          keys: keys.map((key) => create(PublicKeySchema, { data: key.asUint8Array() })),
        }),
      );
    };
    keyring.keysUpdate.on(ctx, update);
    scheduleTask(ctx, update);
  });
