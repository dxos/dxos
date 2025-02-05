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
import { Filter, fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';

import { TableAction } from '../types';

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
    `,
    schema: TableType,
    tools: [
      defineTool({
        name: 'table_new',
        description: 'Create a new table. Returns the artifact definition for the table',
        schema: S.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');
          const intent = pipe(
            // TODO(ZaymonFC): Configure the starting table.
            createIntent(TableAction.Create, { space: extensions.space }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );
          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create table');
          }

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
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
