//
// Copyright 2020 DXOS.org
//

import { codec } from '@dxos/credentials';

import { HaloMessage } from '../types';

export default {
  // TODO(marik-d): Temporary codec bridging logic until we can require proto declarations across package boundaries.
  'dxos.CredentialsMessage': {
    encode: (msg: HaloMessage) => ({ data: codec.encode(msg) }),
    decode: (msg: any): HaloMessage => codec.decode(msg.data)
  }
};
