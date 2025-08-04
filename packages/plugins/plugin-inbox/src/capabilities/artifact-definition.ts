//
// Copyright 2025 DXOS.org
//

// @ts-nocheck
// TODO(burdon): Fix!!!

import { Schema } from 'effect';

import { ToolResult, createTool } from '@dxos/ai';
import { Capabilities, type PromiseIntentDispatcher, contributes } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/blueprints';
import { type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { MailboxType } from '../types';

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
      - Manage the calendar for the current space.
      - You can create a travel itinerary by creating a table from a list of events.
      - Always try to determine the geolocation from the location property of the event.
      - When creating the schema for a travel itinerary you must include a geopoint property (i.e., as an array of [lng,lat]).
      - Suggest to view the itinerary on a map.
    `,
    schema: MailboxType,
    tools: [
      createTool(meta.id, {
        name: 'inspect',
        description: 'Retrieves events for the given calendar.',
        caption: 'Retrieving calendar events...',
        schema: Schema.Struct({}),
        execute: async () => {
          // TODO(burdon): Mock data for demo.
          return ToolResult.Success({
            events: [
              {
                date: '2025-05-16',
                location: 'New York',
              },
              {
                date: '2025-05-17',
                title: 'Effect Conference',
                location: 'Rome',
              },
              {
                date: '2025-05-18',
                title: 'Effect conference',
                location: 'Livorno, Tuscany',
              },
              {
                date: '2025-05-21',
                title: 'Digital Identity Meetup',
                location: 'Barcelona, Spain',
              },
              {
                date: '2025-05-25',
                title: 'Home Visit',
                location: 'Birmingham, UK',
              },
              {
                date: '2025-05-28',
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
