//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
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
      - Always try to determine the geolocation of the event.
      - You can create a travel itinerary by creating a table from a list of events. In this case you must include the geopoint of the event.
      - When creating a schema for an event, always include a geopoint property.
      - You could suggest to view the itinerary on a map.
    `,
    schema: S.Struct({}),
    tools: [
      defineTool(meta.id, {
        name: 'inspect',
        description: 'Retrieves events for the given calendar.',
        caption: 'Retrieving calendar events...',
        schema: S.Struct({}),
        execute: async () => {
          return ToolResult.Success({
            events: [
              {
                date: '2025-03-16',
                location: 'New York',
              },
              {
                date: '2025-03-17',
                title: 'Effect Conference',
                location: 'Rome',
              },
              {
                date: '2025-03-18',
                title: 'Effect conference',
                location: 'Livorno, Tuscany',
              },
              {
                date: '2025-03-25',
                title: 'Digital Identity Meetup',
                location: 'Barcelona, Spain',
              },
              {
                date: '2025-03-21',
                title: 'Home Visit',
                location: 'Birmingham, UK',
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
