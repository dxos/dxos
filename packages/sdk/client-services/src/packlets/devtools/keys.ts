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
import { KeyRecordSchema } from '@dxos/protocols/buf/dxos/halo/keyring_pb';

export const subscribeToKeyringKeys = ({ keyring }: { keyring: Keyring }) =>
  new Stream<SubscribeToKeyringKeysResponse>(({ next, ctx }) => {
    const update = async () => {
      const keys = await keyring.list();
      next(
        create(SubscribeToKeyringKeysResponseSchema, {
          keys: keys.map((key) => create(KeyRecordSchema, { publicKey: key.publicKey })),
        }),
      );
    };
    keyring.keysUpdate.on(ctx, update);
    scheduleTask(ctx, update);
  });
