//
// Copyright 2025 DXOS.org
//

import { Schema, pipe } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { KanbanView } from '@dxos/react-ui-kanban';
import { DataType } from '@dxos/schema';

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
            description: 'The fully qualified typename of the schema to use for the kanban cards.',
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
          const { objects } = await space.db.query(Filter.type(DataType.HasView)).run();
          // TODO(wittjosiah): Remove cast.
          const views = objects.filter((object) => Obj.instanceOf(KanbanView, Relation.getTarget(object as any)));

          const boardInfo = await Promise.all(
            views.map(async (view) => {
              const projection = await view.projection.load();
              return {
                id: fullyQualifiedId(view),
                typename: projection.query.typename,
              };
            }),
          );

          return ToolResult.Success(boardInfo);
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
          const { objects } = await space.db.query(Filter.type(DataType.HasView)).run();
          const view = objects.find((board) => fullyQualifiedId(board) === id);
          invariant(Obj.instanceOf(DataType.HasView, view));
          // TODO(wittjosiah): Remove cast.
          const board = Relation.getTarget(view as any);
          invariant(Obj.instanceOf(KanbanView, board));

          const projection = await view.projection.load();
          const typename = projection.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);

          return ToolResult.Success({
            schema,
            columnField: board.columnFieldId,
            viewFields: projection.fields,
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
