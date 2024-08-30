//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { HeaderCodec, type EncodedKey } from './header-codec';

export const codec = new HeaderCodec<PublicKey>({
  isKey: (value: any): value is PublicKey => value instanceof PublicKey,
  encode: (key: PublicKey): EncodedKey => ({ __k: key.toHex() }),
  decode: (value: EncodedKey): PublicKey => PublicKey.fromHex(value.__k),
});
