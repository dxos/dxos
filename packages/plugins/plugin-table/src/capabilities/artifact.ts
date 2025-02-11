//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { isInstanceOf, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { create, Filter, fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';

import { TableAction } from '../types';
import { schemaTools } from './schema-tool';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

// TODO(ZaymonFC): Move to common, maybe this already exists?
// TODO(ZaymonFC): ID explaination should be moved to the root prompt.
const QualifiedId = S.String.annotations({ description: 'The fully qualified ID of the table `spaceID:objectID`' });

export default () => {
  const definition = defineArtifact({
    id: 'plugin-table',
    // TODO(ZaymonFC): See if we need instructions beyond what the tools define.
    instructions: `
    When working with tables here are some additional instructions:
      - Before appending data to a table you must inspect the table to see its schema. Only add fields that are in the schema.
      - Inspect the table schema even if you have just created the table.
      - When adding rows you must not include the 'id' field -- it is automatically generated.
      - BEFORE adding rows, always make sure the table has been shown to the user!
    `,
    schema: TableType,
    tools: [
      ...schemaTools,
      defineTool({
        name: 'table_new',
        description:
          'Create a new table using an existing schema. Use schema_create first to create a schema, or schema_list to choose an existing one.',
        schema: S.Struct({
          typename: S.String.annotations({
            description: 'The fully qualified typename of the schema to use for the table.',
          }),
          name: S.optional(S.String).annotations({
            description: 'Optional name for the table.',
          }),
        }),
        execute: async ({ typename, name }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          // Validate schema exists first
          const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          if (!schema) {
            return ToolResult.Error(`Schema not found: ${typename}`);
          }

          const intent = pipe(
            createIntent(TableAction.Create, {
              space: extensions.space,
              initialSchema: typename,
              name: name ?? schema.typename,
            }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );

          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create table');
          }

          // Verify the table was created with a view
          const table = data.object;
          const view = await table.view?.load();
          invariant(view, 'Table view was not initialized correctly');

          return ToolResult.Success(createArtifactElement(data.id));
        },
      }),
      defineTool({
        name: 'table_list',
        description: 'List all tables in the current space with their row types.',
        schema: S.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;

          const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();

          const tableInfo = await Promise.all(
            tables.map(async (table) => {
              const view = await table.view?.load();
              return {
                id: fullyQualifiedId(table),
                name: table.name ?? 'Unnamed Table',
                typename: view?.query.type,
              };
            }),
          );

          return ToolResult.Success(tableInfo);
        },
      }),
      defineTool({
        name: 'table_inspect',
        // TODO(ZaymonFC): Tell the LLM how to present the tables to the user.
        description: 'Get the current schema of the table.',
        schema: S.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;

          const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
          const table = tables.find((table) => fullyQualifiedId(table) === id);
          invariant(isInstanceOf(TableType, table));

          const view = await table.view?.load();
          invariant(view);
          const typename = view?.query.type;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);
          return ToolResult.Success(schema);
        },
      }),
      // TODO(ZaymonFC): Search the row of a table? General search functionality? Can we (for now) just dump the entire
      //   table into the context and have it not get too diluted?
      // TODO(ZaymonFC): LIMIT number and indicate that.
      defineTool({
        name: 'table_list_rows',
        description:
          'List all rows in a given table along with their values. NOTE: If the user wants to *see* the table, use the show tool.',
        schema: S.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;

          const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
          const table = tables.find((table) => fullyQualifiedId(table) === id);
          invariant(isInstanceOf(TableType, table));

          const view = await table.view?.load();
          invariant(view);

          const typename = view.query.type;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);

          const { objects: rows } = await space.db.query(Filter.schema(schema)).run();
          return ToolResult.Success(rows);
        },
      }),
      defineTool({
        name: 'table_add_row',
        description: `
            Add a new row to an existing table. Use table_inspect first to understand the schema. Note: row ID is autogenerated.
          `,
        schema: S.Struct({
          id: QualifiedId,
          data: S.Any.annotations({ description: 'The data payload' }),
        }),
        execute: async ({ id, data }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          const space = extensions.space;
          const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
          const table = tables.find((table) => fullyQualifiedId(table) === id);
          invariant(isInstanceOf(TableType, table));

          const intent = createIntent(TableAction.AddRow, {
            table,
            data,
          });

          const { error } = await extensions.dispatch(intent);
          if (error) {
            return ToolResult.Error(error?.message ?? 'Failed to add row to table');
          }

          return ToolResult.Success('Row added successfully');
        },
      }),
      defineTool({
        name: 'table_add_rows',
        description: `
          Add one or more rows to an existing table. Use table_inspect first to understand the schema. Note: row IDs are autogenerated.
        `,
        schema: S.Struct({
          id: QualifiedId,
          data: S.Array(S.Any).annotations({ description: 'Array of data payloads to add as rows' }),
        }),
        execute: async ({ id, data }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          const space = extensions.space;
          const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
          const table = tables.find((table) => fullyQualifiedId(table) === id);
          invariant(isInstanceOf(TableType, table));

          const view = await table.view?.load();
          invariant(view);

          // Get schema for validation.
          const typename = view.query.type;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);

          // Validate all rows.
          // TODO(ZaymonFC): There should be a nicer way to do this!
          const validationResults = data.map((row) => S.validateEither(schema)(create(schema, row)));
          const validationError = validationResults.find((res) => res._tag === 'Left');
          if (validationError) {
            return ToolResult.Error(`Validation failed: ${validationError.left.message}`);
          }

          // Add rows sequentially.
          for (const row of data) {
            const intent = createIntent(TableAction.AddRow, { table, data: row });
            const { error } = await extensions.dispatch(intent);
            if (error) {
              return ToolResult.Error(error?.message ?? 'Failed to add rows to table');
            }
          }

          return ToolResult.Success(`${data.length} rows added successfully`);
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
