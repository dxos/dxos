//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as pipe from 'effect/pipe';
import * as Schema from 'effect/Schema';

import { ToolResult, createTool } from '@dxos/ai';
import { Capabilities, type PromiseIntentDispatcher, chain, contributes, createIntent } from '@dxos/app-framework';
import { createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, fullyQualifiedId } from '@dxos/react-client/echo';
import { KanbanView } from '@dxos/react-ui-kanban';
import { DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
import { KanbanAction } from '../types';

const QualifiedId = Schema.String.annotations({
  description: 'The fully qualified ID of the kanban `spaceID:objectID`',
});

declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: `artifact:${meta.id}`,
    name: meta.name,
    instructions: `
      - Before adding items to a kanban board, inspect the board to see its schema
      - When adding items, you must not include the 'id' field -- it is automatically generated
      - BEFORE adding items, always make sure the board has been shown to the user!
    `,
    schema: KanbanView,
    tools: [
      createTool(meta.id, {
        name: 'create',
        description: `
            Create a new kanban board using an existing schema.
            Use schema_create first to create a schema, or schema_list to choose an existing one.`,
        caption: 'Creating kanban board...',
        schema: Schema.Struct({
          typename: Schema.String.annotations({
            description: 'The fully qualified name of the record type to use for the kanban cards.',
          }),
          pivotColumn: Schema.optional(Schema.String).annotations({
            description: 'Optional field name to use as the column pivot.',
          }),
        }),
        execute: async ({ typename, pivotColumn }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          // Validate schema exists first
          const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          if (!schema) {
            return ToolResult.Error(`Schema not found: ${typename}`);
          }

          const intent = pipe(
            createIntent(KanbanAction.Create, {
              space: extensions.space,
              typename,
              initialPivotColumn: pivotColumn,
            }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );

          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create kanban board');
          }

          return ToolResult.Success(createArtifactElement(data.id));
        },
      }),
      createTool(meta.id, {
        name: 'list',
        description: 'List all kanban boards in the current space.',
        caption: 'Listing kanban boards...',
        schema: Schema.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects } = await space.db.query(Filter.type(DataType.View)).run();

          const boardInfo = await Promise.all(
            objects.map(async (view) => {
              const kanban = await view.presentation.load();
              if (!Obj.instanceOf(KanbanView, kanban)) {
                return null;
              }

              return {
                id: fullyQualifiedId(view),
                name: view.name ?? 'Unnamed Kanban',
                typename: view.query.typename,
              };
            }),
          );

          return ToolResult.Success(boardInfo.filter(isNonNullable));
        },
      }),
      createTool(meta.id, {
        name: 'inspect',
        description: 'Get details about a specific kanban board.',
        caption: 'Inspecting kanban board...',
        schema: Schema.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const view = (await space.db
            // TODO(wittjosiah): Filter.and should aggregate type
            .query(Query.select(Filter.and(Filter.type(DataType.View), Filter.ids(id))))
            .first()) as DataType.View;

          const kanban = await view.presentation.load();
          invariant(Obj.instanceOf(KanbanView, kanban));

          const typename = view.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);

          return ToolResult.Success({
            schema,
            columnField: kanban.columnFieldId,
            viewFields: view.projection.fields,
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
