//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { ConnectionInfo, SwarmInfo } from '@dxos/network-manager';

export default {
  'dxos.credentials.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(value.data)
  },
  'google.protobuf.Timestamp': {
    encode: (value: number) => ({ seconds: value / 1000 }),
    decode: (value: any) => +(value.seconds + '000')
  },
  'dxos.credentials.keys.PrivKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(value.data).asBuffer()
  },
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo': {
    encode: (value: ConnectionInfo) => ({ ...value, events: value.events.map(event => JSON.stringify(event)) }),
    decode: (value: any) => ({ ...value, events: value.events.map((event: any) => JSON.parse(event)) } as ConnectionInfo)
  }
};
