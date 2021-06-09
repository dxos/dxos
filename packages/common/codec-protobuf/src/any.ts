//
// Copyright 2021 DXOS.org
//

import type { Schema } from './schema';

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (value: WithTypeUrl<{}>, schema: Schema<any>): any => {
      if (typeof value.__type_url !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without proper __type_url field set');
      }

      const codec = schema.tryGetCodecForType(value.__type_url);
      const data = codec.encode(value);
      return {
        type_url: value.__type_url,
        value: data
      };
    },
    decode: (value: any, schema: Schema<any>): WithTypeUrl<any> => {
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        __type_url: value.type_url
      };
    }
  }
};

// eslint-disable-next-line camelcase
export type WithTypeUrl<T extends {}> = T & { __type_url: string };
