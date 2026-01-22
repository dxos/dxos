//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolResult, createTool } from '@dxos/ai';
import { Capabilities, Capability, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';
import { Kanban, KanbanView } from '@dxos/react-ui-kanban';
import { View } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

const QualifiedId = Schema.String.annotations({
  description: 'The fully qualified ID of the kanban `spaceID:objectID`',
});

declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default Capability.makeModule(() =>
  Effect.sync(() => {
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
            invariant(extensions?.invoke, 'No operation invoker');

            // Validate schema exists first
            const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
            if (!schema) {
              return ToolResult.Error(`Schema not found: ${typename}`);
            }

            const { view } = await View.makeFromDatabase({
              db: extensions.space.db,
              typename,
            });
            const kanban = Kanban.make({ view });

            const { error } = await extensions.invoke(SpaceOperation.AddObject, {
              target: extensions.space,
              object: kanban,
            });
            if (error) {
              return ToolResult.Error(error?.message ?? 'Failed to add kanban board to space');
            }

            return ToolResult.Success(createArtifactElement(kanban.id));
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
            const { objects } = await space.db.query(Filter.type(View.View)).run();

            const boardInfo = await Promise.all(
              objects.map(async (view) => {
                const kanban = await view.presentation.load();
                if (!Obj.instanceOf(KanbanView, kanban)) {
                  return null;
                }

                return {
                  id: Obj.getDXN(view).toString(),
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
              .query(Query.select(Filter.and(Filter.type(View.View), Filter.id(id))))
              .first()) as View.View;

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

    return Capability.contributes(Capabilities.ArtifactDefinition, definition);
  }),
);
