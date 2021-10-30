//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  'dxos.halo.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(value.data)
  },
  'dxos.halo.keys.PrivKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(value.data).asBuffer()
  },
  'google.protobuf.Timestamp': {
    encode: (value: number) => ({ seconds: value / 1000 }),
    decode: (value: any) => +(value.seconds + '000')
  },
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo.Json': {
    encode: (value: ConnectionEvent) => ({ data: JSON.stringify(value) }),
    decode: (value: any) => JSON.parse(value.data) as ConnectionEvent
  }
};
