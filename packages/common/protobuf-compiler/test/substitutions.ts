import { MyKey } from "./my-key";
import { MyInterfaceSubstitution } from './my-interface'
import { anySubstitutions, Schema as CodecSchema } from "@dxos/codec-protobuf";
import { Timestamp } from "./gen/google/protobuf";

export default {
  'dxos.test.Key': {
    encode: (value: MyKey) => ({ data: value.keyData }),
    decode: (value: any) => new MyKey(value.data),
  },
  'dxos.test.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value,
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
  },
  ...anySubstitutions,
};
