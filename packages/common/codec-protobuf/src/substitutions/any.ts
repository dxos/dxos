//
// Copyright 2021 DXOS.org
//

import type { Schema } from '../schema';

// eslint-disable-next-line camelcase
export type WithTypeUrl<T extends {}> = T & { '@type': string };

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (value: WithTypeUrl<{}>, schema: Schema<any>): any => {
      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without @type string field');
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      const data = codec.encode(value);
      return {
        type_url: value['@type'],
        value: data
      };
    },
    decode: (value: any, schema: Schema<any>): WithTypeUrl<any> => {
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        '@type': value.type_url
      };
    }
  }
};
