//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
import { type Space } from '@dxos/react-client/echo';

declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: 'plugin-inbox',
    instructions: 'List all inbox items for the given inbox.',
    schema: S.Struct({}),
    tools: [
      defineTool({
        name: 'calendar_view',
        description: '',
        schema: S.Struct({}),
        execute: async () => {
          return ToolResult.Success({});
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
