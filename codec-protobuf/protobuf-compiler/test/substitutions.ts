import { MyKey } from "./my-key";
import { MyInterfaceSubstitution } from './my-interface'
import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { DecodedAny } from './any';

export default {
  'dxos.test.Key': {
    encode: (value: MyKey) => ({ data: value.keyData }),
    decode: (value: any) => new MyKey(value.data),
  },
  'dxos.test.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value,
  },
  'google.protobuf.Any': {
    encode: (value: DecodedAny, schema: CodecSchema<any>) => {
      const codec = schema.tryGetCodecForType(value.typeUrl);
      const data = codec.encode(value);
      return {
        type_url: value.typeUrl,
        value: data,
      }
    },
    decode: (value: any, schema: CodecSchema<any>): DecodedAny => {
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        typeUrl: value.type_url,
      }
    }
  }
};
