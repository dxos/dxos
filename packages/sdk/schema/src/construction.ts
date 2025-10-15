//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type EchoSchema,
  FormatEnum,
  type SelectOptionSchema,
  TypeEnum,
  TypedObject,
  formatToType,
} from '@dxos/echo/internal';
import { createEchoSchema } from '@dxos/echo/testing';

import { makeMultiSelectAnnotations, makeSingleSelectAnnotations } from './util';

export type SelectOptionType = typeof SelectOptionSchema.Type;

// TODO(ZaymonFC): Keep this in sync with the schema in `schema-tools.ts`.
export type SchemaPropertyDefinition = {
  // TODO(ZaymonFC): change `name` to `path`.
  name: string;
  format: FormatEnum;
  config?: { options?: SelectOptionType[] };
};

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
      if (prop.format === FormatEnum.SingleSelect) {
        makeSingleSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
      if (prop.format === FormatEnum.MultiSelect) {
        makeMultiSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
    }

    if (prop.format === FormatEnum.GeoPoint) {
      schema.jsonSchema.properties![prop.name].type = TypeEnum.Object;
    }

    schema.jsonSchema.properties![prop.name].format = prop.format;
  }

  return schema;
};
