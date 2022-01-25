//
// Copyright 2020 DXOS.org
//

import { codec, Message } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import { Timeframe } from '../spacetime';
import type { Timestamp } from './gen/google/protobuf';

export default {
  // TODO(marik-d): Temporary codec bridging logic until we can require proto declarations across package boundaries.
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
        .map((frame: any) => [PublicKey.from(new Uint8Array(frame.feedKey)), frame.seq])
    )
  },
  'dxos.halo.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data))
  },
  'google.protobuf.Timestamp': {
    encode: (value: Date): Timestamp => {
      const unixMilliseconds = value.getTime()
      return {
        seconds: (unixMilliseconds / 1000).toString(),
        nanos: (unixMilliseconds % 1000) * 1e6,
      }
    },
    decode: (value: Timestamp): Date => new Date(parseInt(value.seconds ?? '0') * 1000 + (value.nanos ?? 0) / 1e6),
  }
};
