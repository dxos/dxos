//
// Copyright 2021 DXOS.org
//

import { Any, EncodingOptions, WithTypeUrl } from '../common';
import type { Schema } from '../schema';

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (
      value: WithTypeUrl<{}>,
      schema: Schema<any>,
      options: EncodingOptions
    ): any => {
      if (options.preserveAny) {
        if (value['@type'] && value['@type'] !== 'google.protobuf.Any') {
          throw new Error(
            'Can only encode google.protobuf.Any with @type set to google.protobuf.Any in preserveAny mode.'
          );
        }
        return value;
      }

      if (typeof value['@type'] !== 'string') {
        throw new Error(
          'Cannot encode google.protobuf.Any without @type string field'
        );
      }

      if (value['@type'] === 'google.protobuf.Any') {
        // eslint-disable-next-line camelcase
        const { type_url, value: payload } = value as any as Any;
        return {
          type_url, // eslint-disable-line camelcase
          value: payload
        };
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      const data = codec.encode(value);
      return {
        type_url: value['@type'],
        value: data
      };
    },

    decode: (
      value: any,
      schema: Schema<any>,
      options: EncodingOptions
    ): WithTypeUrl<any> => {
      if (options.preserveAny) {
        return {
          '@type': 'google.protobuf.Any',
          type_url: value.type_url ?? '',
          value: value.value ?? new Uint8Array()
        };
      }

      if (!schema.hasType(value.type_url)) {
        return {
          '@type': 'google.protobuf.Any',
          ...value
        };
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
