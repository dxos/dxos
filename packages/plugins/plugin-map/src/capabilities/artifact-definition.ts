//
// Copyright 2025 DXOS.org
//

import { Schema, pipe } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import { Capabilities, chain, createIntent, type PromiseIntentDispatcher, contributes } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
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
    id: `artifact:${meta.id}`,
    name: meta.name,
    instructions: `
      - If the request relates to a map, you must return the map as a valid GeoJSON Point (longitude, latitude) with valid coordinates.
      - If the request relates to a collection of points (like in a table) you can specify the typename and the map will render and center on those markers.
      - If the request generates a table with GeoJSON point, provide a suggestion to the user to view on a map.
    `,
    schema: MapType,
    tools: [
      createTool(meta.id, {
        name: 'list',
        description: 'Query maps.',
        caption: 'Listing maps...',
        schema: Schema.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects } = await extensions.space.db.query(Filter.type(MapType)).run();
          invariant(objects.length > 0, 'No maps found');
          return ToolResult.Success(objects);
        },
      }),
      createTool(meta.id, {
        name: 'create',
        description:
          'Create a new map, optionally with a schema for data points. When creating a map, make sure to use the show tool to display the map to the user.',
        caption: 'Creating map...',
        schema: Schema.Struct({
          center: Schema.optional(
            Schema.Struct({
              longitude: Schema.Number.annotations({ description: 'The longitude of the map center.' }),
              latitude: Schema.Number.annotations({ description: 'The latitude of the map center.' }),
            }),
          ).annotations({ description: 'Optional center coordinates for the map.' }),
          typename: Schema.optional(Schema.String).annotations({
            description: 'Optional fully qualified typename of the schema to use for map points.',
          }),
          locationProperty: Schema.optional(Schema.String).annotations({
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
