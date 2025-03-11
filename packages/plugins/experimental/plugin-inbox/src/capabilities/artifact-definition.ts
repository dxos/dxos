//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';

declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: meta.id,
    name: meta.name,
    instructions: `
      - Manage the calendar for the current space.
    `,
    schema: S.Struct({}),
    tools: [
      defineTool(meta.id, {
        name: 'inspect',
        description: 'List all events for the given calendar.',
        schema: S.Struct({}),
        execute: async () => {
          log.info('calendar_view');
          return ToolResult.Success({
            events: [
              {
                date: '2025-03-16',
                title: 'Pack for trip from home',
                location: 'New York',
              },
              {
                date: '2025-03-17',
                title: 'Effect conference',
                location: 'Rome',
              },
              {
                date: '2025-03-18',
                title: 'Effect conference',
                location: 'Livorno, Tuscany',
              },
              {
                date: '2025-03-21',
                title: 'UK Visit',
                location: 'Birmingham, UK',
              },
              {
                date: '2025-03-25',
                title: 'ETH meetup',
                location: 'Paris',
              },
              {
                date: '2025-03-27',
                title: 'Return home',
                location: 'New York',
              },
            ],
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
