//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { FormatEnum, FormatEnums, SelectOptionSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { hues } from '@dxos/react-ui-theme';
import { getSchemaFromPropertyDefinitions } from '@dxos/schema';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

// TODO(ZaymonFC): Move this somewhere common.
export const TypeNameSchema = Schema.String.pipe(
  Schema.pattern(/^\w+\.\w{2,}\/[\w/]+$/i),
  Schema.annotations({
    title: 'TypeName',
    description:
      'Domain-style type name path. Dashes are not allowed. Use camel case for the final component of the type name.',
    [SchemaAST.ExamplesAnnotationId]: ['example.com/type/Document', 'example.com/type/FlightList'],
  }),
);

const formatDescription = `The format of the property. Additional information:
  ${FormatEnum.GeoPoint}: ${JSON.stringify(Type.toJsonSchema(Type.Format.GeoPoint))}
  This tuple is GeoJSON. You must specify \`${FormatEnum.GeoPoint}\` as [Longitude, Latitude]`;

// TODO(ZaymonFC): All properties are default optional, but maybe we should allow for required properties.
const PropertyDefinitionSchema = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the property.' }),
  format: Schema.Union(...FormatEnums.map((format) => Schema.Literal(format))).annotations({
    description: formatDescription,
  }),
  config: Schema.optional(
    Schema.Struct({
      options: Schema.optional(
        Schema.Array(SelectOptionSchema)
          .annotations({
            description: `Options for SingleSelect/MultiSelect formats. Available colors: ${hues.join(', ')}`,
          })
          .pipe(Schema.mutable),
      ),
    }),
  ),
}).pipe(Schema.mutable);

const SYSTEM_NAMESPACE = 'dxos.org/echo/schema';

export default () =>
  contributes(Capabilities.Tools, [
    createTool(SYSTEM_NAMESPACE, {
      name: 'list',
      description: 'List registered records in the space.',
      caption: 'Listing registered records...',
      schema: Schema.Struct({}),
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
    createTool(SYSTEM_NAMESPACE, {
      name: 'get',
      description: 'Get a specific record by its typename.',
      caption: 'Getting record...',
      schema: Schema.Struct({
        typename: Schema.String.annotations({
          description: 'The fully qualified typename of the record.',
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
    createTool(SYSTEM_NAMESPACE, {
      name: 'create',
      description: 'Create a new record with the provided definition.',
      caption: 'Creating record...',
      schema: Schema.Struct({
        typename: TypeNameSchema.annotations({
          description:
            'The fully qualified schema typename. Must start with a domain, and then one or more path components (e.g., "example.com/type/TypeName").',
        }),
        properties: Schema.Array(PropertyDefinitionSchema).pipe(
          Schema.annotations({ description: 'Array of property definitions for the record.' }),
          Schema.mutable,
        ),
      }),
      execute: async ({ typename, properties }, { extensions }) => {
        invariant(extensions?.space, 'No space.');
        const space = extensions.space;

        const schema = getSchemaFromPropertyDefinitions(typename, properties);
        const [registeredSchema] = await space.db.schemaRegistry.register([schema]);

        return ToolResult.Success(registeredSchema);
      },
    }),
  ]);
