//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { codec, Message } from '@dxos/credentials';
import { publicKeySubstitutions, timeframeSubstitutions } from '@dxos/protocols';

export default {
  ...anySubstitutions,
  ...timeframeSubstitutions,
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  // TODO(marik-d): Temporary codec bridging logic until we can require proto declarations across package boundaries.
  'dxos.echo.feed.CredentialsMessage': {
    encode: (msg: Message) => ({ data: codec.encode(msg) }),
    decode: (msg: any): Message => codec.decode(msg.data)
  }
};
