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
  const definition = defineArtifact({
    id: 'plugin-map',
    instructions: `
    Maps:
    - If the request relates to a map, you must return the map as a valid GeoJSON Point (longitude, latitude) with valid coordinates.
    - If the request relates to a collection of points (like in a table) you can specify the typename and the map will render and center on those markers.
    - If the request generates a table with GeoJSON point, provide a suggestion to the user to view on a map.
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
        description:
          'Create a new map, optionally with a schema for data points. When creating a map, make sure to use the show tool to display the map to the user.',
        schema: S.Struct({
          center: S.optional(
            S.Struct({
              longitude: S.Number.annotations({ description: 'The longitude of the map center.' }),
              latitude: S.Number.annotations({ description: 'The latitude of the map center.' }),
            }),
          ).annotations({ description: 'Optional center coordinates for the map.' }),
          typename: S.optional(S.String).annotations({
            description: 'Optional fully qualified typename of the schema to use for map points.',
          }),
          locationProperty: S.optional(S.String).annotations({
            description: 'Optional field name to use as the location property.',
          }),
        }),
        execute: async ({ center, typename, locationProperty }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          // Validate schema if provided.
          if (typename) {
            const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
            if (!schema) {
              return ToolResult.Error(`Schema not found: ${typename}`);
            }
          }

          // Don't supply coordinates if typename is supplied.
          const coordinates = typename
            ? undefined
            : center
              ? ([center.longitude, center.latitude] as const)
              : undefined;

          const intent = pipe(
            createIntent(MapAction.Create, {
              space: extensions.space,
              coordinates,
              initialSchema: typename,
              locationProperty,
            }),
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

  return contributes(Capabilities.ArtifactDefinition, definition);
};
