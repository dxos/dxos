//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, chain, createIntent, type PromiseIntentDispatcher, contributes } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';

import { MapAction, MapType } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const artifact = defineArtifact({
    id: 'plugin-map',
    prompt: `
    Maps:
    - If the user's message relates to a map, you must return the map as a valid GeoJSON Point with valid coordinates.
    `,
    schema: MapType,
    tools: [
      defineTool({
        name: 'map_query',
        description: 'Query all active maps.',
        schema: S.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects } = await extensions.space.db.query(Filter.schema(MapType)).run();
          invariant(objects.length > 0, 'No maps found');
          return ToolResult.Success(objects);
        },
      }),
      defineTool({
        name: 'map_new',
        description: 'Create a new map.',
        schema: S.Struct({
          longitude: S.Number.annotations({ description: 'The longitude of the map.' }),
          latitude: S.Number.annotations({ description: 'The latitude of the map.' }),
        }),
        execute: async ({ longitude, latitude }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');
          const intent = pipe(
            createIntent(MapAction.Create, { coordinates: [longitude, latitude] }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );
          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create map');
          }
          return ToolResult.Success(createArtifactElement(data.id));
        },
      }),
    ],
  });

  return contributes(Capabilities.Artifact, artifact);
};
