//
// Copyright 2022 DXOS.org
//

export const timestampSubstitutions = {
  'google.protobuf.Timestamp': {
    encode: (value: Date | { seconds: bigint; nanos: number }): any => {
      if (value instanceof Date) {
        const unixMilliseconds = value.getTime();
        return {
          seconds: Math.floor(unixMilliseconds / 1000).toString(),
          nanos: (unixMilliseconds % 1000) * 1e6,
        };
      }
      return {
        seconds: value.seconds.toString(),
        nanos: value.nanos ?? 0,
      };
    },

    decode: (value: any): Date => new Date(parseInt(value.seconds ?? '0') * 1000 + (value.nanos ?? 0) / 1e6),
  },
};
