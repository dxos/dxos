//
// Copyright 2021 DXOS.org
//

import { type EncodingOptions, type WithTypeUrl } from '../common';
import { type TypeMapperContext } from '../mapping';
import type { Schema } from '../schema';

import { structSubstitutions } from './struct';

export const anySubstitutions = {
  'google.protobuf.Any': {
    encode: (
      value: WithTypeUrl<{}>,
      context: TypeMapperContext,
      schema: Schema<any>,
      options: EncodingOptions,
    ): any => {
      const field = schema.getCodecForType(context.messageName).protoType.fields[context.fieldName];
      if (options.preserveAny || field.getOption('preserve_any')) {
        if (value['@type'] && value['@type'] !== 'google.protobuf.Any') {
          throw new Error(
            'Can only encode google.protobuf.Any with @type set to google.protobuf.Any in preserveAny mode.',
          );
        }
        // Normalize to snake_case type_url for protobuf.js wire encoding.
        const v = value as any;
        return { type_url: v.type_url ?? v.typeUrl ?? '', value: v.value ?? new Uint8Array() };
      }

      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without @type string field');
      }

      if (value['@type'] === 'google.protobuf.Any') {
        return value as any;
      }

      if (value['@type'] === 'google.protobuf.Struct') {
        const codec = schema.tryGetCodecForType(value['@type']);
        return codec.encodeAsAny(structSubstitutions['google.protobuf.Struct'].encode(value));
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      return codec.encodeAsAny(value);
    },

    decode: (
      value: any,
      context: TypeMapperContext,
      schema: Schema<any>,
      options: EncodingOptions,
    ): WithTypeUrl<any> => {
      const field = schema.getCodecForType(context.messageName).protoType.fields[context.fieldName];
      if (options.preserveAny || field.getOption('preserve_any')) {
        return {
          '@type': 'google.protobuf.Any',
          type_url: value.type_url ?? value.typeUrl ?? '',
          value: value.value ?? new Uint8Array(),
        };
      }

      const typeUrl = value.type_url ?? value.typeUrl ?? '';
      if (!schema.hasType(typeUrl)) {
        return {
          '@type': 'google.protobuf.Any',
          ...value,
        };
      }
      const codec = schema.tryGetCodecForType(typeUrl);
      let data = codec.decode(value.value);

      if (typeUrl === 'google.protobuf.Struct') {
        data = structSubstitutions['google.protobuf.Struct'].decode(data);
      }

      return {
        ...data,
        '@type': typeUrl,
      };
    },
  },
};
