//
// Copyright 2021 DXOS.org
//

import type { Schema } from '../schema';
import { Any } from '../service';

// eslint-disable-next-line camelcase
export type WithTypeUrl<T extends {}> = T & { '@type': string };

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (value: WithTypeUrl<{}>, schema: Schema<any>): any => {
      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without @type string field');
      }

      if(value['@type'] === 'google.protobuf.Any') {
        const { type_url, value: payload } = value as any as Any;
        return {
          type_url,
          value: payload,
        }
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      const data = codec.encode(value);
      return {
        type_url: value['@type'],
        value: data
      };
    },
    decode: (value: any, schema: Schema<any>): WithTypeUrl<any> => {
      if(!schema.hasType(value.type_url)) {
        return {
          '@type': 'google.protobuf.Any',
          ...value.value
        }
      }
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        '@type': value.type_url
      };
    }
  }
};
