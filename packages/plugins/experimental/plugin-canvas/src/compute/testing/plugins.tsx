//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { Chess } from 'chess.js';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { isImage } from '@dxos/conductor';
import {
  createStatic,
  EchoObject,
  GeoPoint,
  isInstanceOf,
  ObjectId,
  type HasId,
  type HasTypename,
} from '@dxos/echo-schema';
import { Chessboard } from '@dxos/plugin-chess';
import { MapControl } from '@dxos/plugin-map';

import { JsonFilter } from '../../components';
import { defineTool, LLMToolResult, type LLMTool } from '@dxos/assistant';
import { invariant } from '@dxos/invariant';

export type Artifact = {
  id: string;
  prompt: string;
  schema: S.Schema.AnyNoContext;
  tools: LLMTool[];
};

export const defineArtifact = (artifact: Artifact): Artifact => artifact;

export const ChessSchema = S.Struct({
  value: S.String.annotations({ description: 'FEN notation' }),
}).pipe(EchoObject('example.com/type/Chess', '0.1.0'));
export type ChessSchema = S.Schema.Type<typeof ChessSchema>;

export const MapSchema = S.Struct({
  coordinates: GeoPoint,
}).pipe(EchoObject('example.com/type/Map', '0.1.0'));
export type MapSchema = S.Schema.Type<typeof MapSchema>;

export type ArtifactsContext = {
  items: (HasTypename & HasId)[];
  getArtifacts: () => (HasTypename & HasId)[];
  addArtifact: (artifact: HasTypename & HasId) => void;
};

declare global {
  interface LLMToolContextExtensions {
    artifacts: ArtifactsContext;
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
          extensions.artifacts.addArtifact(artifact);
          return LLMToolResult.Success(formatArtifact(artifact.id));
        },
      }),
      defineTool({
        name: 'chess_query',
        description: 'Query all active chess games.',
        schema: S.Struct({}),
        execute: async (_, { extensions }) => {
          const artifacts = extensions.artifacts.getArtifacts();
          invariant(artifacts.length > 0, 'No chess games found');
          return LLMToolResult.Success(artifacts);
        },
      }),
      defineTool({
        name: 'chess_inspect',
        description: 'Get the current state of the chess game.',
        schema: S.Struct({ id: ObjectId }),
        execute: async ({ id }, { extensions }) => {
          const artifact = extensions.artifacts.getArtifacts().find((artifact) => artifact.id === id);
          invariant(isInstanceOf(ChessSchema, artifact));
          return LLMToolResult.Success(artifact.value);
        },
      }),
      defineTool({
        name: 'chess_move',
        description: 'Make a move in the chess game.',
        schema: S.Struct({
          id: ObjectId,
          move: S.String.annotations({
            description: 'The move to make in the chess game.',
            examples: ['e4', 'Bf3'],
          }),
        }),
        execute: async ({ id, move }, { extensions }) => {
          const artifact = extensions.artifacts.getArtifacts().find((artifact) => artifact.id === id);
          invariant(isInstanceOf(ChessSchema, artifact));
          const board = new Chess(artifact.value);
          board.move(move);
          artifact.value = board.fen();
          return LLMToolResult.Success(artifact.value);
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
].reduce<Record<string, Artifact>>((acc, artifact) => {
  acc[artifact.id] = artifact;
  return acc;
}, {});

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
      filter: (data): data is any => isInstanceOf(ChessSchema, data),
      component: ({ role, data }) => (
        <Chessboard
          model={{ chess: new Chess(data.value) }}
          onUpdate={(move) => {
            console.log('move', move);
            const board = new Chess(data.value);
            board.move(move);
            data.value = board.fen();
          }}
        />
      ),
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
