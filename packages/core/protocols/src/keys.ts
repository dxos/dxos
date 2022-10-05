//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export const publicKeySubstitutions = {
  // TODO(dmaretskyi): Rename to dxos.crypto.PublicKey.
  'dxos.keys.PublicKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data))
  },

  // TODO(dmaretskyi): Shouldn't be substituted to PublicKey.
  'dxos.keys.PrivateKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer()
  }
};
