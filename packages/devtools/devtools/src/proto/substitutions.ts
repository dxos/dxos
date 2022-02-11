//
// Copyright 2021 DXOS.org
//

import type { Any, Schema } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';
import { Timeframe } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  'google.protobuf.Timestamp': {
    encode: (value: Date): any => {
      const unixMilliseconds = value.getTime();
      return {
        seconds: Math.floor((unixMilliseconds / 1000)).toString(),
        nanos: (unixMilliseconds % 1000) * 1e6
      };
    },
    decode: (value: any): Date => new Date(parseInt(value.seconds ?? '0') * 1000 + (value.nanos ?? 0) / 1e6)
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
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo.Json': {
    encode: (value: ConnectionEvent) => ({ data: JSON.stringify(value) }),
    decode: (value: any) => JSON.parse(value.data) as ConnectionEvent
  },
  'google.protobuf.Any': {
    encode: (value: any, schema: Schema<any>): Any => {
      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without proper "@type" field set');
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      const data = codec.encode(value);
      return {
        type_url: value['@type'],
        value: data
      };
    },
    decode: (value: Any, schema: Schema<any>): any => {
      console.log('decode any', value);

      const codec = schema.tryGetCodecForType(value.type_url!);
      const data = codec.decode(value.value!);
      return {
        '@type': value.type_url,
        ...data
      };
    }
  }
};
