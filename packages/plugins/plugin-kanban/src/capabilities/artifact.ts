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
import { KanbanType } from '@dxos/react-ui-kanban';

import { KanbanAction } from '../types';

const QualifiedId = S.String.annotations({
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
    id: 'plugin-kanban',
    instructions: `
        When working with kanban boards here are some additional instructions:
        - Before adding items to a kanban board, inspect the board to see its schema
        - When adding items, you must not include the 'id' field -- it is automatically generated
        - BEFORE adding items, always make sure the board has been shown to the user!
      `,
    schema: KanbanType,
    tools: [
      defineTool({
        name: 'kanban_new',
        description: `
            Create a new kanban board using an existing schema.
            Use schema_create first to create a schema, or schema_list to choose an existing one.`,
        schema: S.Struct({
          typename: S.String.annotations({
            description: 'The fully qualified typename of the schema to use for the kanban cards.',
          }),
          pivotColumn: S.optional(S.String).annotations({
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
              initialSchema: typename,
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
      defineTool({
        name: 'kanban_list',
        description: 'List all kanban boards in the current space.',
        schema: S.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects: boards } = await space.db.query(Filter.schema(KanbanType)).run();

          const boardInfo = await Promise.all(
            boards.map(async (board: KanbanType) => {
              const view = await board.cardView?.load();
              return {
                id: fullyQualifiedId(board),
                typename: view?.query.type,
              };
            }),
          );

          return ToolResult.Success(boardInfo);
        },
      }),
      defineTool({
        name: 'kanban_inspect',
        description: 'Get details about a specific kanban board.',
        schema: S.Struct({ id: QualifiedId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects: boards } = await space.db.query(Filter.schema(KanbanType)).run();
          const board = boards.find((board: KanbanType) => fullyQualifiedId(board) === id);
          invariant(isInstanceOf(KanbanType, board));

          const view = await board.cardView?.load();
          invariant(view);

          const typename = view.query.type;
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
