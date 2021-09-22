//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { GetKeyringKeysResponse } from '@dxos/devtools';

const keyTypeToString = (type: KeyType): string => {
  const types = {
    [KeyType.DEVICE]: 'Device',
    [KeyType.FEED]: 'Feed',
    [KeyType.IDENTITY]: 'Identity',
    [KeyType.PARTY]: 'Party',
    [KeyType.UNKNOWN]: 'Unknown'
  };
  return types[type];
};

export const getKeyringKeys = (hook: DevtoolsContext): GetKeyringKeysResponse => {
  const { keyring } = hook;

  return {
    keys: keyring.keys
      .map(({ type, publicKey, added, own, trusted }) => ({
        type: keyTypeToString(type), publicKey: publicKey.asUint8Array(), added, own, trusted
      }))
  }; 
};
