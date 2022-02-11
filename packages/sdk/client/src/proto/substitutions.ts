//
// Copyright 2021 DXOS.org
//

import { Any, Schema, timestampSubstitutions } from '@dxos/codec-protobuf';
import { codec, Message } from '@dxos/credentials';
import { PublicKey, publicKeySubstitutions } from '@dxos/crypto';
import { Timeframe } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,

  // TODO(dmaretskyi): Remove this and include halo messages directly.
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
