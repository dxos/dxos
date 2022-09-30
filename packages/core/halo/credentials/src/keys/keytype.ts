//
// Copyright 2020 DXOS.org
//

import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

export type SecretKey = Buffer;

export const keyTypeName = (keyType: KeyType) => KeyType[keyType];
