//
// Copyright 2020 DXOS.org
//

import { KeyType } from '../proto/gen/dxos/halo/keys';

export type SecretKey = Buffer;
export type DiscoveryKey = Buffer;

export const keyTypeName = (keyType: KeyType) => {
  return KeyType[keyType];
};
