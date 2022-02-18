import { MyKey } from "../my-key";
import { MyInterfaceSubstitution } from '../my-interface'
import { anySubstitutions, timestampSubstitutions, Schema as CodecSchema } from "@dxos/codec-protobuf";
import { Timestamp } from "./gen/google/protobuf";

export default {
  ...timestampSubstitutions,
  ...anySubstitutions,
  'dxos.test.Key': {
    encode: (value: MyKey) => ({ data: value.keyData }),
    decode: (value: any) => new MyKey(value.data),
  },
  'dxos.test.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value,
  },
};
