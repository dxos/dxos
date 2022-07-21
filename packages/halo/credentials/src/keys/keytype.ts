//
// Copyright 2020 DXOS.org
//

import { KeyType } from '../proto/gen/dxos/halo/keys';

export type SecretKey = Buffer;

export const keyTypeName = (keyType: KeyType) => KeyType[keyType];
