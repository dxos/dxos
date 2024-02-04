//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

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

export interface JsonSchema {
  $schema?: string;
  type: string;
  properties?: { [key: string]: JsonSchema };
  description?: string;
}

export const toJsonSchema = (schema: Schema): JsonSchema => {
  return schema.props.reduce<JsonSchema>(
    (schema, { id, type, description }) => {
      invariant(id);
      // TODO(burdon): Handle objects.
      schema.properties![id] = { type: getPropType(type), description };
      return schema;
    },
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {},
    },
  );
};
