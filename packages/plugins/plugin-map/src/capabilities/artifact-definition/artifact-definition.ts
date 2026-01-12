//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolResult, createTool } from '@dxos/ai';
import { Capabilities, Capability, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';
import { View } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { Map } from '../../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default Capability.makeModule(() =>
  Effect.sync(() => {
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
                  id: Obj.getDXN(view).toString(),
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
            invariant(extensions?.invoke, 'No operation invoker');

            // Validate schema if provided.
            if (typename) {
              const schema = await extensions.space.db.schemaRegistry.query({ typename }).firstOrUndefined();
              if (!schema) {
                return ToolResult.Error(`Schema not found: ${typename}`);
              }
            }

            let view: View.View | undefined;
            if (typename) {
              const result = await View.makeFromDatabase({
                db: extensions.space.db,
                typename,
              });
              view = result.view;
            }

            const map = Map.make({ center, view });

            const { error } = await extensions.invoke(SpaceOperation.AddObject, {
              target: extensions.space,
              object: map,
            });
            if (error) {
              return ToolResult.Error(error?.message ?? 'Failed to add map to space');
            }

            return ToolResult.Success(createArtifactElement(map.id));
          },
        }),
      ],
    });

    return Capability.contributes(Capabilities.ArtifactDefinition, definition);
  }),
);
