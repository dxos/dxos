//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type EchoSchema,
  type JsonSchemaType,
  type SelectOptionSchema,
  TypeEnum,
  TypeFormat,
  TypedObject,
  formatToType,
} from '@dxos/echo/internal';
import { createEchoSchema } from '@dxos/echo/testing';

export type SelectOptionType = typeof SelectOptionSchema.Type;

// TODO(ZaymonFC): Keep this in sync with the schema in `schema-tools.ts`.
export type SchemaPropertyDefinition = {
  // TODO(ZaymonFC): change `name` to `path`.
  name: string;
  format: TypeFormat;
  config?: { options?: SelectOptionType[] };
};

// TODO(burdon): Factor out.
export const getSchemaFromPropertyDefinitions = (
  typename: string,
  properties: SchemaPropertyDefinition[],
): EchoSchema => {
  // TODO(burdon): Move to echo-schema.
  const typeToSchema: Record<TypeEnum, Schema.Any> = {
    [TypeEnum.String]: Schema.String.pipe(Schema.optional),
    [TypeEnum.Number]: Schema.Number.pipe(Schema.optional),
    [TypeEnum.Boolean]: Schema.Boolean.pipe(Schema.optional),
    [TypeEnum.Object]: Schema.Object.pipe(Schema.optional),
    // TODO(ZaymonFC): Arrays are undercooked, we should specify the item type / format as well.
    [TypeEnum.Array]: Schema.Array(Schema.Any),
    [TypeEnum.Ref]: Schema.String.pipe(Schema.optional), // TODO(burdon): Is this correct for refs?
  };

  const fields: any = Object.fromEntries(
    properties.filter((prop) => prop.name !== 'id').map((prop) => [prop.name, typeToSchema[formatToType[prop.format]]]),
  );

  const schema = createEchoSchema(TypedObject({ typename, version: '0.1.0' })(fields));

  for (const prop of properties) {
    if (prop.config?.options) {
      if (prop.format === TypeFormat.SingleSelect) {
        makeSingleSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
      if (prop.format === TypeFormat.MultiSelect) {
        makeMultiSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
    }

    if (prop.format === TypeFormat.GeoPoint) {
      schema.jsonSchema.properties![prop.name].type = TypeEnum.Object;
    }

    schema.jsonSchema.properties![prop.name].format = prop.format;
  }

  return schema;
};

/**
 * Creates or updates echo annotations for SingleSelect options in a JSON Schema property.
 */
// TODO(burdon): Factor out (dxos/echo)
export const makeSingleSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  jsonProperty.enum = options.map(({ id }) => id);
  jsonProperty.format = TypeFormat.SingleSelect;
  jsonProperty.annotations = {
    meta: {
      singleSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};

/**
 * Creates or updates echo annotations for MultiSelect options in a JSON Schema property.
 */
// TODO(burdon): Factor out (dxos/echo)
export const makeMultiSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  // TODO(ZaymonFC): Is this how do we encode an array of enums?
  jsonProperty.type = 'object';
  jsonProperty.items = { type: 'string', enum: options.map(({ id }) => id) };
  jsonProperty.format = TypeFormat.MultiSelect;
  jsonProperty.annotations = {
    meta: {
      multiSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};
