//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { createStatic, EchoObject, type HasId, type HasTypename, isInstanceOf, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { MapType } from '../types';

export const ChessSchema = S.Struct({
  value: S.String.annotations({ description: 'FEN notation' }),
}).pipe(EchoObject('example.com/type/Chess', '0.1.0'));

export type ChessSchema = S.Schema.Type<typeof ChessSchema>;

// TODO(burdon): Move to ECHO def.
export type ArtifactsContext = {
  items: (HasTypename & HasId)[];
  getArtifacts: () => (HasTypename & HasId)[];
  addArtifact: (artifact: HasTypename & HasId) => void;
};

declare global {
  interface ToolContextExtensions {
    artifacts?: ArtifactsContext;
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
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifacts = extensions.artifacts.getArtifacts().filter((artifact) => isInstanceOf(MapType, artifact));
          invariant(artifacts.length > 0, 'No maps found');
          return ToolResult.Success(artifacts);
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
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifact = createStatic(MapType, { coordinates: [longitude, latitude] });
          extensions.artifacts.addArtifact(artifact);
          return ToolResult.Success(createArtifactElement(artifact.id));
        },
      }),
    ],
  });

  return contributes(Capabilities.Artifact, artifact);
};
