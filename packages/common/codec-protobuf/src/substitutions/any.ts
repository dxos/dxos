//
// Copyright 2021 DXOS.org
//

import { type EncodingOptions, type WithTypeUrl } from '../common';
import { type TypeMapperContext } from '../mapping';
import type { Schema } from '../schema';
import { structSubstitutions } from './struct';

// NOTE: User-space `Any` uses camelCase `typeUrl` (matches `@bufbuild/protobuf/wkt.Any`).
// Wire-level (protobufjs) still serializes the proto-defined snake_case `type_url`
// field, so encode-time we translate `typeUrl` -> `type_url` and decode-time we
// translate the inverse. This boundary lets the rest of the codebase (and bufbuild
// interop in `@dxos/rpc`) avoid carrying snake_case helpers.

/** Pull camelCase `typeUrl` (preferred) or snake_case `type_url` (legacy wire) off `value`. */
const readTypeUrl = (value: any): string => value?.typeUrl ?? value?.type_url ?? '';

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
        // Re-emit in the snake_case wire shape that protobufjs's encoder expects.
        return { type_url: readTypeUrl(value), value: (value as any).value };
      }

      if (typeof value['@type'] !== 'string') {
        throw new Error('Cannot encode google.protobuf.Any without @type string field');
      }

      if (value['@type'] === 'google.protobuf.Any') {
        return { type_url: readTypeUrl(value), value: (value as any).value };
      }

      if (value['@type'] === 'google.protobuf.Struct') {
        const codec = schema.tryGetCodecForType(value['@type']);
        const inner = codec.encodeAsAny(structSubstitutions['google.protobuf.Struct'].encode(value));
        return { type_url: inner.typeUrl, value: inner.value };
      }

      const codec = schema.tryGetCodecForType(value['@type']);
      const inner = codec.encodeAsAny(value);
      return { type_url: inner.typeUrl, value: inner.value };
    },

    decode: (
      value: any,
      context: TypeMapperContext,
      schema: Schema<any>,
      options: EncodingOptions,
    ): WithTypeUrl<any> => {
      const typeUrl = readTypeUrl(value);
      const field = schema.getCodecForType(context.messageName).protoType.fields[context.fieldName];
      if (options.preserveAny || field.getOption('preserve_any')) {
        return {
          '@type': 'google.protobuf.Any',
          typeUrl,
          value: value.value ?? new Uint8Array(),
        };
      }

      if (!schema.hasType(typeUrl)) {
        return {
          '@type': 'google.protobuf.Any',
          typeUrl,
          value: value.value ?? new Uint8Array(),
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
