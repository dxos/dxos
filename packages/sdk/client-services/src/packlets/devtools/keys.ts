//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Keyring } from '@dxos/keyring';
import { SubscribeToKeyringKeysResponse } from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToKeyringKeys = ({ keyring }: { keyring: Keyring }) =>
  new Stream<SubscribeToKeyringKeysResponse>(({ next }) => {
    next({ keys: keyring.keys });
    return keyring.keysUpdate.on((keys) => {
      next({ keys });
    });
  });
