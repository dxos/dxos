//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: 'plugin-calendar',
    instructions: 'Manage the calendar for the current space.',
    schema: S.Struct({}),
    tools: [
      defineTool({
        name: 'calendar_view',
        description: 'List all events for the given calendar.',
        schema: S.Struct({}),
        execute: async () => {
          log.info('calendar_view');
          return ToolResult.Success({});
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
