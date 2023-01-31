//
// Copyright 2021 DXOS.org
//

import { EncodingOptions, WithTypeUrl } from '../common';
import { TypeMapperContext } from '../mapping';
import type { Schema } from '../schema';

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (
      value: WithTypeUrl<{}>,
      context: TypeMapperContext,
      schema: Schema<any>,
      options: EncodingOptions
    ): any => {
      const field = schema.getCodecForType(context.messageName).protoType.fields[context.fieldName];
      if (options.preserveAny || field.getOption('preserve_any')) {
        if (value['@type'] && value['@type'] !== 'google.protobuf.Any') {
          throw new Error(
            'Can only encode google.protobuf.Any with @type set to google.protobuf.Any in preserveAny mode.'
          );
        }
        return value;
      }

      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without @type string field');
      }

      if (value['@type'] === 'google.protobuf.Any') {
        // eslint-disable-next-line camelcase
        return value as any;
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      return codec.encodeAsAny(value);
    },

    decode: (
      value: any,
      context: TypeMapperContext,
      schema: Schema<any>,
      options: EncodingOptions
    ): WithTypeUrl<any> => {
      const field = schema.getCodecForType(context.messageName).protoType.fields[context.fieldName];
      if (options.preserveAny || field.getOption('preserve_any')) {
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
