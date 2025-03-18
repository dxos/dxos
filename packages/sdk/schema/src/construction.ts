//
// Copyright 2025 DXOS.org
//

import { DescriptionAnnotationId, ExamplesAnnotationId, TitleAnnotationId } from '@effect/schema/AST';

import {
  FormatEnum,
  FormatEnums,
  formatToType,
  S,
  TypedObject,
  TypeEnum,
  SelectOptionSchema,
  GeoPoint,
  toJsonSchema,
} from '@dxos/echo-schema';
import { createEchoSchema } from '@dxos/live-object/testing';

import { makeSingleSelectAnnotations } from './util';

// TODO(ZaymonFC): Workout how to get the theme values! (Or enrich the schema at the tool level).
// import { hues } from '@dxos/react-ui-theme';
const hues = ['rose', 'emerald'];

// TODO(ZaymonFC): Reconcile all duplication between this and schema-tool.ts

// TODO(ZaymonFC): Move this somewhere common.
export const TypeNameSchema = S.String.pipe(
  S.pattern(/^\w+\.\w{2,}\/[\w/]+$/i),
  S.annotations({
    [TitleAnnotationId]: 'TypeName',
    [DescriptionAnnotationId]:
      'Domain-style type name path. Dashes are not allowed. Use camel case for the final component of the type name.',
    [ExamplesAnnotationId]: ['example.com/type/Document', 'example.com/type/FlightList'],
  }),
);

const formatDescription = `The format of the property. Additional information:
  ${FormatEnum.GeoPoint}: ${JSON.stringify(toJsonSchema(GeoPoint))}
  This tuple is GeoJSON. You must specify \`${FormatEnum.GeoPoint}\` as [Longitude, Latitude]`;

// TODO(ZaymonFC): All properties are default optional, but maybe we should allow for required properties.
export const PropertyDefinitionSchema = S.Struct({
  name: S.String.annotations({ [DescriptionAnnotationId]: 'The name of the property.' }),
  format: S.Union(...FormatEnums.map((format) => S.Literal(format))).annotations({
    [DescriptionAnnotationId]: formatDescription,
  }),
  config: S.optional(
    S.Struct({
      options: S.optional(
        S.Array(SelectOptionSchema).annotations({
          description: `Options for SingleSelect/MultiSelect formats. Available colors: ${hues.join(', ')}`,
        }),
      ),
    }),
  ),
}).pipe(S.mutable);

type PropertyDefinition = typeof PropertyDefinitionSchema.Type;

export const echoSchemaFromPropertyDefinitions = (typename: string, properties: PropertyDefinition[]) => {
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
    properties.map((prop) => [prop.name, typeToSchema[formatToType[prop.format]]]),
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
      schema.jsonSchema.properties![prop.name].format = FormatEnum.GeoPoint;
      schema.jsonSchema.properties![prop.name].type = TypeEnum.Object;
    }
  }

  return schema;
};
