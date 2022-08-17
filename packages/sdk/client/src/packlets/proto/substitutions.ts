//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { codec, Message } from '@dxos/credentials';
import type { ConnectionEvent } from '@dxos/network-manager';
import { publicKeySubstitutions, timeframeSubstitutions } from '@dxos/protocols';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...anySubstitutions,

  // TODO(dmaretskyi): Remove this and include halo messages directly.
  'dxos.echo.feed.CredentialsMessage': {
    encode: (msg: Message) => ({ data: codec.encode(msg) }),
    decode: (msg: any): Message => codec.decode(msg.data)
  },
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo.Json': {
    encode: (value: ConnectionEvent) => ({ data: JSON.stringify(value) }),
    decode: (value: any) => JSON.parse(value.data) as ConnectionEvent
  }
};
