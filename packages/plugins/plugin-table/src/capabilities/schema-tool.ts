//
// Copyright 2025 DXOS.org
//

import { DescriptionAnnotationId, TitleAnnotationId } from '@effect/schema/AST';

import { defineTool, ToolResult } from '@dxos/artifact';
import { FormatEnum, FormatEnums, formatToType, S, TypedObject, TypeEnum, SelectOptionSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { hues } from '@dxos/react-ui-theme';

const availableFormats = FormatEnums;

// TODO(ZaymonFC): Move this somewhere common.
export const TypeNameSchema = S.String.pipe(
  S.pattern(/^[\da-z.-]+\.[a-z]{2,6}(\/[A-Za-z][\w-]*)*$/i),
  S.annotations({
    [TitleAnnotationId]: 'TypeName',
    [DescriptionAnnotationId]: 'Domain-style type name path',
  }),
);

// TODO(ZaymonFC): All properties are default optional, but maybe we should allow for required properties.
const PropertyDefinitionSchema = S.Struct({
  name: S.String.annotations({ description: 'The name of the property.' }),
  format: S.Enums(FormatEnum).annotations({
    description: 'The format of the property (call schema_formats for full list).',
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

// TODO(ZaymonFC): If this works well, move this to global tools.
export const schemaTools = [
  defineTool({
    name: 'schema_list',
    description: 'List all registered schemas in the space.',
    schema: S.Struct({}),
    execute: async (_input, { extensions }) => {
      invariant(extensions?.space, 'No space.');
      const space = extensions.space;

      const schemas = await space.db.schemaRegistry.query({}).run();

      return ToolResult.Success(
        schemas.map((schema) => ({
          typename: schema.typename,
          version: schema.version,
        })),
      );
    },
  }),
  defineTool({
    name: 'schema_get',
    description: 'Get a specific schema by its typename.',
    schema: S.Struct({
      typename: S.String.annotations({
        description: 'The fully qualified typename of the schema.',
      }),
    }),
    execute: async ({ typename }, { extensions }) => {
      invariant(extensions?.space, 'No space.');
      const space = extensions.space;

      const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
      if (!schema) {
        return ToolResult.Error(`Schema not found: ${typename}`);
      }

      return ToolResult.Success(schema);
    },
  }),
  defineTool({
    name: 'schema_formats',
    description: 'Get the list of available property formats in schema definitions.',
    schema: S.Any,
    execute: async () => {
      return ToolResult.Success({
        formats: Object.entries(availableFormats).map(([name, format]) => ({
          name,
          value: format,
        })),
      });
    },
  }),
  defineTool({
    name: 'schema_create',
    description: 'Create a new schema with the provided definition.',
    schema: S.Struct({
      typename: TypeNameSchema.annotations({
        description:
          'The fully qualified schema typename. Must start with a domain, and then one or more path components. eg: example.com/type-name.',
      }),
      properties: S.Array(PropertyDefinitionSchema).pipe(
        S.annotations({ description: 'Array of property definitions for the schema.' }),
        S.mutable,
      ),
    }),
    execute: async ({ typename, properties }, { extensions }) => {
      invariant(extensions?.space, 'No space.');
      const space = extensions.space;

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

      const schema = TypedObject({ typename, version: '0.1.0' })(fields);
      const [registeredSchema] = await space.db.schemaRegistry.register([schema]);

      // TODO(ZaymonFC): This is a temporary workaround.
      //   We should consolidate schema manipulation logic between here and the ViewProjection.
      //   Currently this just implements the SingleSelect format, but we need to extend this
      //   to all formats.
      for (const prop of properties) {
        if (prop.format === FormatEnum.SingleSelect && prop.config?.options) {
          registeredSchema.jsonSchema.properties![prop.name].format = FormatEnum.SingleSelect;
          registeredSchema.jsonSchema.properties![prop.name].oneOf = prop.config.options.map(
            ({ id, title, color }) => ({ const: id, title, color }),
          );
        }

        if (prop.format === FormatEnum.LatLng) {
          registeredSchema.jsonSchema.properties![prop.name].format = FormatEnum.LatLng;
          registeredSchema.jsonSchema.properties![prop.name].type = TypeEnum.Object;
        }
      }

      return ToolResult.Success(registeredSchema);
    },
  }),
];
