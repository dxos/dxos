//
// Copyright 2021 DXOS.org
//

import { Timestamp } from './gen/google/protobuf';

export default {
  'google.protobuf.Timestamp': {
    encode: (value: Date): Timestamp => {
      const unixMilliseconds = value.getTime();
      return {
        seconds: Math.floor((unixMilliseconds / 1000)).toString(),
        nanos: (unixMilliseconds % 1000) * 1e6
      };
    },
    decode: (value: Timestamp): Date => new Date(parseInt(value.seconds ?? '0') * 1000 + (value.nanos ?? 0) / 1e6)
  }
};
