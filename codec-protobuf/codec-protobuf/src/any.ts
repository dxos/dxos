//
// Copyright 2021 DXOS.org
//

import { Schema } from './codec';

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (value: any, schema: Schema<any>): any => {
      const codec = schema.tryGetCodecForType(value.__type_url);
      const data = codec.encode(value);
      return {
        type_url: value.__type_url,
        value: data
      };
    },
    decode: (value: any, schema: Schema<any>): any => {
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        __type_url: value.type_url
      };
    }
  }
};
