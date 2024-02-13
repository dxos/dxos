//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { stripUndefinedValues } from '@dxos/util';

import { Schema } from '../proto';

// TODO(burdon): Reconcile with plugin-table.
export const getPropType = (type?: Schema.PropType): string => {
  switch (type) {
    case Schema.PropType.REF:
      return 'ref';
    case Schema.PropType.BOOLEAN:
      return 'boolean';
    case Schema.PropType.NUMBER:
      return 'number';
    case Schema.PropType.DATE:
      return 'date';
    case Schema.PropType.STRING:
      return 'string';
    case Schema.PropType.RECORD:
      return 'object';
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

/**
 * @deprecated Use TS-Effect types to generate JSON Schema
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: { [key: string]: JsonSchema };
  items?: JsonSchema;
}

/**
 * @deprecated
 */
export const getTypename = (schema: JsonSchema): string | undefined => {
  const match = schema.$ref?.match(/#\/\$defs\/(.+)/);
  if (match) {
    return match[1];
  } else {
    return undefined;
  }
};

/**
 * @deprecated Use TS-Effect types to generate JSON Schema
 */
export const toJsonSchema = (schema: Schema): JsonSchema => {
  return schema.props.reduce<JsonSchema>(
    (schema, { id, type, description }) => {
      invariant(id);
      // TODO(burdon): Handle nested objects.
      schema.properties![id] = stripUndefinedValues({ type: getPropType(type), description });
      return schema;
    },
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      // TODO(burdon): Invalid use of $id. Use ref which must be a valid URI.
      // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-9.2
      $id: schema.typename,
      // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-8
      $ref: schema.typename,

      title: schema.typename.split(/[.-/]/).pop(),
      type: 'object',
      properties: {},
    },
  );
};

/**
 * Convert ECHO schema to ts-effect schema.
 * @deprecated Next version will support ts-effect directly.
 */
export const toEffectSchema = (schema: Schema): S.Schema<any> => {
  // TODO(burdon): Recursive?
  const fields = schema.props.reduce<Record<string, S.Schema<any>>>((fields, { id, type, description }) => {
    let field: S.Schema<any>;
    switch (type) {
      case Schema.PropType.STRING:
        field = S.string;
        break;
      case Schema.PropType.BOOLEAN:
        field = S.boolean;
        break;
      case Schema.PropType.NUMBER:
        field = S.number;
        break;

      case Schema.PropType.REF:
      case Schema.PropType.DATE:
      case Schema.PropType.RECORD:
      default:
        log.error(`Invalid type: ${type}`);
        return fields;
    }

    if (description) {
      field = field.pipe(S.description(description));
    }

    fields[id!] = field;
    return fields;
  }, {});

  return S.struct(fields).pipe(S.identifier(schema.typename));
};
