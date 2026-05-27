//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Registry, Type } from '@dxos/echo';
import {
  EchoObjectSchema,
  Format,
  FormatAnnotation,
  type JsonSchemaType,
  type Mutable,
  PropertyMetaAnnotationId,
  type SelectOption,
  TypeEnum,
  formatToType,
} from '@dxos/echo/internal';
import { createEchoSchema } from '@dxos/echo/testing';
import { DXN, PublicKey } from '@dxos/keys';

export type SelectOptionType = typeof SelectOption.Type;

// TODO(ZaymonFC): Keep this in sync with the schema in `schema-tools.ts`.
export type SchemaPropertyDefinition = {
  // TODO(ZaymonFC): change `name` to `path`.
  name: string;
  format: Format.TypeFormat;
  config?: { options?: SelectOptionType[] };
};

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
    description: Schema.optional(Schema.String).annotations({
      title: 'Description',
    }),
    // NSID last segment must start with a letter (DXN spec), so prefix the random hex.
  }).pipe(Type.makeObject(DXN.make(`com.example.type.example${PublicKey.random().truncate()}`, '0.1.0')));

export const getSchema = async (dxn: DXN, registry?: Registry.Registry): Promise<Type.AnyEntity | undefined> => {
  if (!DXN.isDXN(dxn)) {
    return;
  }

  const type = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  if (!type || !version || !registry) {
    return;
  }
  return registry.getTypeByDXN(`dxn:type:${type}:${version}`);
};

// TODO(burdon): Factor out.
export const getSchemaFromPropertyDefinitions = (
  typename: string,
  properties: SchemaPropertyDefinition[],
): Type.Type => {
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

  // `EchoObjectSchema(...)` yields a static `Type.Obj` entity; unwrap to its
  // source schema (which carries the typename annotation) before handing it to
  // `createEchoSchema`, which expects a raw Effect Schema.
  const typeSchema = Schema.Struct(fields).pipe(EchoObjectSchema(DXN.make(typename, '0.1.0')));
  const schema = createEchoSchema(Type.getSchema(typeSchema));

  // Wrap schema modifications in Type.update so they run inside the schema's change context.
  Type.update(schema, () => {
    for (const prop of properties) {
      const jsonProp = schema.jsonSchema.properties![prop.name] as Mutable<JsonSchemaType>;
      if (prop.config?.options) {
        if (prop.format === Format.TypeFormat.SingleSelect) {
          makeSingleSelectAnnotations(jsonProp, [...prop.config.options]);
        }
        if (prop.format === Format.TypeFormat.MultiSelect) {
          makeMultiSelectAnnotations(jsonProp, [...prop.config.options]);
        }
      }

      if (prop.format === Format.TypeFormat.GeoPoint) {
        jsonProp.type = TypeEnum.Object;
      }

      jsonProp.format = prop.format;
    }
  });

  return schema;
};

/**
 * Creates or updates echo annotations for SingleSelect options in a JSON Schema property.
 */
// TODO(burdon): Factor out (dxos/echo)
export const makeSingleSelectAnnotations = (
  jsonProperty: Mutable<JsonSchemaType>,
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
  jsonProperty: Mutable<JsonSchemaType>,
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
