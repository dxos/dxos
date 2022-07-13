//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Timeframe } from './timeframe';

export const timeframeSubstitutions = {
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
