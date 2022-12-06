//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Keyring } from '@dxos/keyring';
import { SubscribeToKeyringKeysResponse } from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToKeyringKeys = ({ keyring }: { keyring: Keyring }) =>
  new Stream<SubscribeToKeyringKeysResponse>(({ next }) => {
    const update = () => {
      next({
        keys: keyring.list()
      });
    };
    const unsubscribe = keyring.keysUpdate.on(update);
    update();
    return unsubscribe;
  });
