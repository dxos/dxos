//
// Copyright 2025 DXOS.org
//

import { FormatEnum, formatToType, S, TypedObject, TypeEnum, type SelectOptionSchema } from '@dxos/echo-schema';
import { createEchoSchema } from '@dxos/live-object/testing';

import { makeSingleSelectAnnotations } from './util';

// TODO(ZaymonFC): Keep this in sync with the schema in `schema-tools.ts`.
export type SchemaPropertyDefinition = {
  // TODO(ZaymonFC): change `name` to `path`.
  name: string;
  format: FormatEnum;
  config?: {
    options?: Array<S.Schema.Type<typeof SelectOptionSchema>>;
  };
};

export const echoSchemaFromPropertyDefinitions = (typename: string, properties: SchemaPropertyDefinition[]) => {
  const typeToSchema: Record<TypeEnum, S.Any> = {
    [TypeEnum.String]: S.String.pipe(S.optional),
    [TypeEnum.Number]: S.Number.pipe(S.optional),
    [TypeEnum.Boolean]: S.Boolean.pipe(S.optional),
    [TypeEnum.Object]: S.Object.pipe(S.optional),
    [TypeEnum.Ref]: S.String.pipe(S.optional), // TODO(burdon): Is this correct for refs?
  };

  // TODO(ZaymonFC): It would be better to construct the full JSON schema here, formats and all.
  //   This way we are falling back to the primitive type only.
  const fields: any = Object.fromEntries(
    properties.filter((prop) => prop.name !== 'id').map((prop) => [prop.name, typeToSchema[formatToType[prop.format]]]),
  );

  const schema = createEchoSchema(TypedObject({ typename, version: '0.1.0' })(fields));

  // TODO(ZaymonFC): This is a temporary workaround.
  //   We should consolidate schema manipulation logic between here and the ViewProjection.
  //   We need to extend this to support all formats!!
  for (const prop of properties) {
    if (prop.format === FormatEnum.SingleSelect && prop.config?.options) {
      makeSingleSelectAnnotations(schema.jsonSchema.properties![prop.name], [...prop.config.options]);
    }

    if (prop.format === FormatEnum.GeoPoint) {
      schema.jsonSchema.properties![prop.name].type = TypeEnum.Object;
    }

    schema.jsonSchema.properties![prop.name].format = prop.format;
  }

  return schema;
};
