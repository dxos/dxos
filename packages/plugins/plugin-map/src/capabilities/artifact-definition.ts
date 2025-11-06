//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Capabilities, type PromiseIntentDispatcher, chain, contributes, createIntent } from '@dxos/app-framework';
import { createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, fullyQualifiedId } from '@dxos/react-client/echo';
import { View } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
import { Map, MapAction } from '../types';

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
    schema: Map.Map,
    tools: [
      createTool(meta.id, {
        name: 'list',
        description: 'Query maps.',
        caption: 'Listing maps...',
        schema: Schema.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects } = await space.db.query(Filter.type(View.View)).run();

          const mapInfo = await Promise.all(
            objects.map(async (view) => {
              const map = await view.presentation.load();
              if (!Obj.instanceOf(Map.Map, map)) {
                return null;
              }

              return {
                id: fullyQualifiedId(view),
                name: view.name ?? 'Unnamed Map',
                typename: view.query.typename,
              };
            }),
          );

          return ToolResult.Success(mapInfo.filter(isNonNullable));
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
            description: 'Optional fully qualified name of the record type to use for map points.',
          }),
          locationFieldId: Schema.String.annotations({
            description: 'Field name to use as the location property.',
          }),
        }),
        execute: async ({ center, typename, locationFieldId }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          // Validate schema if provided.
          if (typename) {
            const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
            if (!schema) {
              return ToolResult.Error(`Schema not found: ${typename}`);
            }
          }

          const intent = Function.pipe(
            createIntent(MapAction.Create, {
              space: extensions.space,
              typename,
              locationFieldId,
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
