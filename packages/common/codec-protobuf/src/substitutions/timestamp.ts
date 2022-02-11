export const timestampSubstitutions = {
  'google.protobuf.Timestamp': {
    encode: (value: Date): any => {
      const unixMilliseconds = value.getTime()
      return {
        seconds: (unixMilliseconds / 1000).toString(),
        nanos: (unixMilliseconds % 1000) * 1e6,
      }
    },
    decode: (value: any): Date => new Date(parseInt(value.seconds ?? '0') * 1000 + (value.nanos ?? 0) / 1e6),
  }
};
