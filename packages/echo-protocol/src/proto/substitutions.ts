//
// Copyright 2020 DXOS.org
//

import { codec, Message } from '@dxos/credentials';

export default {
  // TODO(marik-d): Temporary codec bridging logic until we can require proto declarations across package boundaries.
  'dxos.CredentialsMessage': {
    encode: (msg: Message) => ({ data: codec.encode(msg) }),
    decode: (msg: any): Message => codec.decode(msg.data)
  }
};
