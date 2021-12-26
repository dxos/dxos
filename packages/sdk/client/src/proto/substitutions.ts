//
// Copyright 2021 DXOS.org
//

import { codec, Message } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { Timeframe } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  'dxos.echo.feed.CredentialsMessage': {
    encode: (msg: Message) => ({ data: codec.encode(msg) }),
    decode: (msg: any): Message => codec.decode(msg.data)
  },
  'dxos.echo.feed.TimeframeVector': {
    encode: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq }))
    }),
    decode: (vector: any) => new Timeframe(
      (vector.frames ?? [])
        .filter((frame: any) => frame.feedKey != null && frame.seq != null)
        .map((frame: any) => [PublicKey.from(frame.feedKey), frame.seq])
    )
  },
  'dxos.halo.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data))
  },
  'dxos.halo.keys.PrivKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer()
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
