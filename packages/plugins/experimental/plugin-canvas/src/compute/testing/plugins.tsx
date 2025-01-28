//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { Chess } from 'chess.js';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { isImage } from '@dxos/conductor';
import { createStatic, EchoObject, GeoPoint, isInstanceOf, type HasTypename, type ObjectId } from '@dxos/echo-schema';
import { Chessboard } from '@dxos/plugin-chess';
import { MapControl } from '@dxos/plugin-map';

import { JsonFilter } from '../../components';
import { defineTool, LLMToolResult, type LLMTool } from '@dxos/assistant';

export type Artifact = {
  id: string;
  prompt: string;
  schema: S.Schema.AnyNoContext;
  tools: LLMTool[];
};

export const defineArtifact = (artifact: Artifact): Artifact => artifact;

export const ChessSchema = S.Struct({
  value: S.String.annotations({ description: 'FEN string' }),
}).pipe(EchoObject('example.com/type/Chess', '0.1.0'));

export const MapSchema = S.Struct({
  coordinates: GeoPoint,
}).pipe(EchoObject('example.com/type/Map', '0.1.0'));
export type MapSchema = S.Schema.Type<typeof MapSchema>;

declare global {
  interface LLMToolContextExtensions {
    artifacts: {
      items: HasTypename[];
    };
  }
}

const formatArtifact = (id: ObjectId) => `<artifact id=${id} />`;

// TODO(burdon): Define artifact providers.
export const artifacts: Record<string, Artifact> = [
  defineArtifact({
    id: 'plugin-image',
    prompt: `
    Images:
    - When presenting an image, you must use an artifact.
    - Nest the <image> tag inside the <artifact> tag.
    - Image tags are always self-closing and must contain an id attribute.
    (Example: <artifact><image id="unique_identifier" prompt="..." /></artifact>)
    `,
    schema: S.Struct({}),
    tools: [],
  }),
  defineArtifact({
    id: 'plugin-chess',
    prompt: `
    Chess:
    - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
    `,
    schema: ChessSchema,
    tools: [
      defineTool({
        name: 'chess_new',
        description: 'Create a new chess game. Returns the artifact definition for the game',
        schema: S.Struct({
          fen: S.String.annotations({ description: 'The state of the chess game in the FEN format.' }),
        }),
        execute: async ({ fen }, { extensions }) => {
          const artifact = createStatic(ChessSchema, { value: fen });
          extensions.artifacts.items.push(artifact);
          return LLMToolResult.Success(formatArtifact(artifact.id));
        },
      }),
    ],
  }),
  defineArtifact({
    id: 'plugin-map',
    prompt: `
    Maps:
    - If the user's message relates to a map, you must return the map as a valid GeoJSON Point with valid coordinates.
    `,
    schema: MapSchema,
    tools: [],
  }),
].reduce(
  (acc, artifact) => {
    acc[artifact.id] = artifact;
    return acc;
  },
  {} as Record<string, Artifact>,
);

// TODO(burdon): Rename Capability.Any.
export const capabilities: AnyCapability[] = [
  //
  // Image
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-image',
      role: 'canvas-node',
      filter: (data: any): data is any => isImage(data.value),
      component: ({ data }) => (
        <img
          className='grow object-cover'
          src={`data:image/jpeg;base64,${data.value.source.data}`}
          alt={data.value.prompt ?? `Generated image [id=${data.value.id}]`}
        />
      ),
    }),
  ),

  //
  // Chess
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-chess',
      role: 'canvas-node',
      filter: (data) => isInstanceOf(ChessSchema, data),
      component: ({ role, data }) => <Chessboard model={{ chess: new Chess(data.value) }} />,
    }),
  ),

  //
  // Map
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-map',
      role: 'canvas-node',
      filter: (data) => isInstanceOf(MapSchema, data),
      component: ({ role, data }) => {
        const [lng = 0, lat = 0] = data.coordinates;
        return <MapControl center={{ lat, lng }} zoom={14} />;
      },
    }),
  ),

  //
  // Default
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-default',
      role: 'canvas-node',
      disposition: 'fallback',
      component: ({ role, data }) => <JsonFilter data={data} />,
    }),
  ),
];
