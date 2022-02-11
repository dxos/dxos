//
// Copyright 2021 DXOS.org
//

import { Any, newAnySubstitutions, Schema, timestampSubstitutions } from '@dxos/codec-protobuf';
import { codec, Message } from '@dxos/credentials';
import { PublicKey, publicKeySubstitutions } from '@dxos/crypto';
import { Timeframe, timeframeSubstitutions } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...newAnySubstitutions,

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
