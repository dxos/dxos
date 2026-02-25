//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, structSubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

export const substitutions = {
  'dxos.keys.PublicKey': {
    encode: (value: PublicKey | { data: Uint8Array }) => ({
      data: value instanceof PublicKey ? value.asUint8Array() : value.data,
    }),
    decode: (value: any) => PublicKey.from(value.data),
  },

  // TODO(dmaretskyi): Shouldn't be substituted to PublicKey.
  'dxos.keys.PrivateKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer(),
  },

  'dxos.echo.timeframe.TimeframeVector': {
    encode: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({
        feedKey: feedKey instanceof PublicKey ? feedKey.asUint8Array() : feedKey,
        seq,
      })),
    }),

    decode: (vector: any) =>
      new Timeframe(
        (vector.frames ?? [])
          .filter((frame: any) => frame.feedKey != null && frame.seq != null)
          .map((frame: any) => [PublicKey.from(frame.feedKey), frame.seq]),
      ),
  },
};

export default {
  ...anySubstitutions,
  ...structSubstitutions,
  ...substitutions,
  ...timestampSubstitutions,
};
