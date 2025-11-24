//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Format, Type } from '@dxos/echo';
||||||| 87517e966b
=======
import { Type } from '@dxos/echo';
>>>>>>> origin/main
import {
  type EchoSchema,
<<<<<<< HEAD
  FormatAnnotation,
||||||| 87517e966b
  FormatEnum,
=======
  FormatAnnotation,
  FormatEnum,
>>>>>>> origin/main
  type JsonSchemaType,
  PropertyMetaAnnotationId,
  type RuntimeSchemaRegistry,
  type SelectOptionSchema,
  TypeEnum,
  TypedObject,
  formatToType,
} from '@dxos/echo/internal';
import { createEchoSchema } from '@dxos/echo/testing';
import { type EchoSchemaRegistry } from '@dxos/echo-db';
import { type DXN, PublicKey } from '@dxos/keys';

export type SelectOptionType = typeof SelectOptionSchema.Type;

// TODO(ZaymonFC): Keep this in sync with the schema in `schema-tools.ts`.
export type SchemaPropertyDefinition = {
  // TODO(ZaymonFC): change `name` to `path`.
  name: string;
  format: Format.TypeFormat;
  config?: { options?: SelectOptionType[] };
};

<<<<<<< HEAD
export const createDefaultSchema = () =>
  Schema.Struct({
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    status: Schema.optional(
      Schema.Literal('todo', 'in-progress', 'done')
        .pipe(FormatAnnotation.set(Format.TypeFormat.SingleSelect))
        .annotations({
          title: 'Status',
          [PropertyMetaAnnotationId]: {
            singleSelect: {
              options: [
                { id: 'todo', title: 'Todo', color: 'indigo' },
                { id: 'in-progress', title: 'In Progress', color: 'purple' },
                { id: 'done', title: 'Done', color: 'amber' },
              ],
            },
          },
        }),
    ),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  }).pipe(
    Type.Obj({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    }),
  );

export const getSchema = async (
  dxn: DXN,
  registry?: RuntimeSchemaRegistry,
  echoRegistry?: EchoSchemaRegistry,
): Promise<Type.Obj.Any | undefined> => {
  const staticSchema = registry?.getSchemaByDXN(dxn);
  if (staticSchema) {
    return staticSchema;
  }

  const typeDxn = dxn.asTypeDXN();
  if (!typeDxn) {
    return;
  }

  const { type, version } = typeDxn;
  const echoSchema = await echoRegistry?.query({ typename: type, version }).firstOrUndefined();
  return echoSchema?.snapshot;
};

||||||| 87517e966b
=======
export const createDefaultSchema = () =>
  Schema.Struct({
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    status: Schema.optional(
      Schema.Literal('todo', 'in-progress', 'done')
        .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
        .annotations({
          title: 'Status',
          [PropertyMetaAnnotationId]: {
            singleSelect: {
              options: [
                { id: 'todo', title: 'Todo', color: 'indigo' },
                { id: 'in-progress', title: 'In Progress', color: 'purple' },
                { id: 'done', title: 'Done', color: 'amber' },
              ],
            },
          },
        }),
    ),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  }).pipe(
    Type.Obj({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    }),
  );

export const getSchema = async (
  dxn: DXN,
  registry?: RuntimeSchemaRegistry,
  echoRegistry?: EchoSchemaRegistry,
): Promise<Type.Obj.Any | undefined> => {
  const staticSchema = registry?.getSchemaByDXN(dxn);
  if (staticSchema) {
    return staticSchema;
  }

  const typeDxn = dxn.asTypeDXN();
  if (!typeDxn) {
    return;
  }

  const { type, version } = typeDxn;
  const echoSchema = await echoRegistry?.query({ typename: type, version }).firstOrUndefined();
  return echoSchema?.snapshot;
};

>>>>>>> origin/main
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
      if (prop.format === Format.TypeFormat.SingleSelect) {
        makeSingleSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
      if (prop.format === Format.TypeFormat.MultiSelect) {
        makeMultiSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
      }
    }

    if (prop.format === Format.TypeFormat.GeoPoint) {
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
  jsonProperty.format = Format.TypeFormat.SingleSelect;
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
  jsonProperty.format = Format.TypeFormat.MultiSelect;
  jsonProperty.annotations = {
    meta: {
      multiSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};
