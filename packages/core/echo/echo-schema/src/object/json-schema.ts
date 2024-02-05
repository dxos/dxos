//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
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

// TODO(burdon): https://json-schema.org/implementations#javascript
// https://json-schema.org/learn/getting-started-step-by-step#define
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: { [key: string]: JsonSchema };
  items?: JsonSchema;
}

export const toJsonSchema = (schema: Schema): JsonSchema => {
  const parts = schema.typename.split('.');
  return schema.props.reduce<JsonSchema>(
    (schema, { id, type, description }) => {
      invariant(id);
      // TODO(burdon): Handle nested objects.
      schema.properties![id] = stripUndefinedValues({ type: getPropType(type), description });
      return schema;
    },
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: schema.typename,
      title: parts[parts.length - 1],
      type: 'object',
      properties: {},
    },
  );
};
