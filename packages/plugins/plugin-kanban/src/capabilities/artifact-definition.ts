//
// Copyright 2025 DXOS.org
//

import { Schema, pipe } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { KanbanType } from '@dxos/react-ui-kanban';

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
    schema: KanbanType,
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
          const { objects: boards } = await space.db.query(Filter.type(KanbanType)).run();

          const boardInfo = await Promise.all(
            boards.map(async (board: KanbanType) => {
              const view = await board.cardView?.load();
              return {
                id: fullyQualifiedId(board),
                typename: view?.query.typename,
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
          const { objects: boards } = await space.db.query(Filter.type(KanbanType)).run();
          const board = boards.find((board: KanbanType) => fullyQualifiedId(board) === id);
          invariant(Obj.instanceOf(KanbanType, board));

          const view = await board.cardView?.load();
          invariant(view);

          const typename = view.query.typename;
          const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);

          return ToolResult.Success({
            schema,
            columnField: board.columnFieldId,
            viewFields: view.fields,
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
