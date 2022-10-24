//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

export const substitutions = {
  'dxos.keys.PublicKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data))
  },

  // TODO(dmaretskyi): Shouldn't be substituted to PublicKey.
  'dxos.keys.PrivateKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer()
  },

  'dxos.echo.timeframe.TimeframeVector': {
    encode: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq }))
    }),

    decode: (vector: any) => new Timeframe(
      (vector.frames ?? [])
        .filter((frame: any) => frame.feedKey != null && frame.seq != null)
        .map((frame: any) => [PublicKey.from(new Uint8Array(frame.feedKey)), frame.seq])
    )
  }
};

export default {
  ...anySubstitutions,
  ...substitutions,
  ...timestampSubstitutions
};
