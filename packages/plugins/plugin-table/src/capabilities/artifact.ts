//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
// import { isInstanceOf, ObjectId, S } from '@dxos/echo-schema';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';

import { TableAction } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: 'plugin-table',
    // TODO(ZaymonFC): See if we need instructions beyond what the tools define.
    instructions: '',
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
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
