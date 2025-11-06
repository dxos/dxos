//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { ToolResult, createTool } from '@dxos/ai';
import { Capabilities, type PromiseIntentDispatcher, chain, contributes, createIntent } from '@dxos/app-framework';
import { createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
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
const QualifiedId = Schema.String.annotations({
  description: 'The fully qualified ID of the table `spaceID:objectID`',
});

export default () => {
  const definition = defineArtifact({
    id: `artifact:${meta.id}`,
    name: meta.name,
    // TODO(ZaymonFC): See if we need instructions beyond what the tools define.
    instructions: `
      - Before appending data to a table you must inspect the table to see its schema. Only add fields that are in the schema.
      - Inspect the table schema even if you have just created the table.
      - When adding rows you must not include the 'id' field -- it is automatically generated.
      - BEFORE adding rows, always make sure the table has been shown to the user.
    `,
    schema: TableView,
    tools: [
      createTool(meta.id, {
        name: 'create',
        description: `
          Create a new table using an existing schema.
          Use schema_create first to create a schema, or schema_list to choose an existing one.
        `,
        caption: 'Creating table...',
        schema: Schema.Struct({
          typename: Schema.String.annotations({
            description: 'The fully qualified name of the record type to use for the table.',
          }),
          name: Schema.optional(Schema.String).annotations({
            description: 'Optional name for the table.',
          }),
        }),
        execute: async ({ typename, name }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          // Validate schema exists first.
          const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          if (!schema) {
            return ToolResult.Error(`Schema not found: ${typename}`);
          }

          const intent = Function.pipe(
            createIntent(TableAction.Create, {
              space: extensions.space,
              typename,
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
      createTool(meta.id, {
        name: 'list',
        description: 'List all tables in the current space with their row types.',
        caption: 'Querying tables...',
        schema: Schema.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          // TODO(wittjosiah): This query needs to be able to filter to just the table view, post-filtering is awkward.
          const { objects } = await space.db.query(Filter.type(DataType.View.View)).run();
          const tableInfo = await Promise.all(
            objects.map(async (view) => {
              const presentation = await view.presentation.load();
              if (!Obj.instanceOf(TableView, presentation)) {
                return null;
              }

              return {
                id: Obj.getDXN(view).toString(),
                name: view.name ?? 'Unnamed Table',
                typename: view.query.typename,
              };
            }),
          );

          return ToolResult.Success(tableInfo.filter(isNonNullable));
        },
      }),
      createTool(meta.id, {
        name: 'inspect',
        // TODO(ZaymonFC): Tell the LLM how to present the tables to the user.
        description: 'Get the current record type of the table.',
        caption: 'Loading table...',
        schema: Schema.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const view = (await space.db
            // TODO(wittjosiah): Filter.and should aggregate type
            .query(Query.select(Filter.and(Filter.type(DataType.View.View), Filter.ids(id))))
            .first()) as DataType.View.View;

          const table = await view.presentation.load();
          invariant(Obj.instanceOf(TableView, table));

          const typename = view.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).first();
          return ToolResult.Success(schema);
        },
      }),
      // TODO(ZaymonFC): Search the row of a table? General search functionality? Can we (for now) just dump the entire
      //   table into the context and have it not get too diluted?
      // TODO(ZaymonFC): LIMIT number and indicate that.
      createTool(meta.id, {
        name: 'list-rows',
        description: `
          List all rows in a given table along with their values.
          NOTE: If the user wants to *see* the table, use the show tool.
        `,
        caption: 'Loading table rows...',
        schema: Schema.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const view = (await space.db
            // TODO(wittjosiah): Filter.and should aggregate type
            .query(Query.select(Filter.and(Filter.type(DataType.View.View), Filter.ids(id))))
            .first()) as DataType.View.View;

          const table = await view.presentation.load();
          invariant(Obj.instanceOf(TableView, table));

          const typename = view.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).first();
          const { objects: rows } = await space.db.query(Filter.type(schema)).run();
          return ToolResult.Success(rows);
        },
      }),
      createTool(meta.id, {
        name: 'insert-rows',
        description: `
          Add one or more rows to an existing table.
          Use table_inspect first to understand the schema.
        `,
        caption: 'Inserting table rows...',
        schema: Schema.Struct({
          id: QualifiedId,
          data: Schema.Array(Schema.Any).annotations({ description: 'Array of data payloads to add as rows' }),
        }),
        execute: async ({ id, data }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          const space = extensions.space;
          const view = (await space.db
            // TODO(wittjosiah): Filter.and should aggregate type
            .query(Query.select(Filter.and(Filter.type(DataType.View.View), Filter.ids(id))))
            .first()) as DataType.View.View;
          // Get schema for validation.
          const typename = view.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).first();

          const table = await view.presentation.load();
          invariant(Obj.instanceOf(TableView, table));

          // Validate all rows.
          // TODO(ZaymonFC): There should be a nicer way to do this!
          const validationResults = data.map((row) => Schema.validateEither(schema)(Obj.make(schema, row)));
          const validationError = validationResults.find((res) => res._tag === 'Left');
          if (validationError) {
            return ToolResult.Error(`Validation failed: ${validationError.left.message}`);
          }

          // Add rows sequentially.
          for (const row of data) {
            const intent = createIntent(TableAction.AddRow, { view, data: row });
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
