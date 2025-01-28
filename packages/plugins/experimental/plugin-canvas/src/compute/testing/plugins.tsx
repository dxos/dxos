//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { Chess } from 'chess.js';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { isImage } from '@dxos/conductor';
import { EchoObject, GeoPoint, isInstanceOf } from '@dxos/echo-schema';
import { Chessboard } from '@dxos/plugin-chess';
import { MapControl } from '@dxos/plugin-map';

import { JsonFilter } from '../../components';

export type Artifact = {
  id: string;
  prompt: string;
  schema: S.Schema.AnyNoContext;
};

export const createArtifact = (artifact: Artifact): Artifact => artifact;

export const ChessSchema = S.Struct({
  value: S.String.annotations({ description: 'FEN notation' }),
}).pipe(EchoObject('example.com/type/Chess', '0.1.0'));
export type ChessSchema = S.Schema.Type<typeof ChessSchema>;

export const MapSchema = S.Struct({
  coordinates: GeoPoint,
}).pipe(EchoObject('example.com/type/Map', '0.1.0'));
export type MapSchema = S.Schema.Type<typeof MapSchema>;

// TODO(burdon): Define artifact providers.
export const artifacts: Record<string, Artifact> = [
  createArtifact({
    id: 'plugin-image',
    prompt: `
    Images:
    - When presenting an image, you must use an artifact.
    - Nest the <image> tag inside the <artifact> tag.
    - Image tags are always self-closing and must contain an id attribute.
    (Example: <artifact><image id="unique_identifier" prompt="..." /></artifact>)
    `,
    schema: S.Struct({}),
  }),
  createArtifact({
    id: 'plugin-chess',
    prompt: `
    Chess:
    - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
    `,
    schema: ChessSchema,
  }),
  createArtifact({
    id: 'plugin-map',
    prompt: `
    Maps:
    - If the user's message relates to a map, you must return the map as a valid GeoJSON Point with valid coordinates.
    `,
    schema: MapSchema,
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
      filter: (data): data is any => {
        return false;
      },
      // filter: (data) => isInstanceOf(ChessSchema, data),
      // filter: (data): data is any => {
      //   try {
      //     const game = new Chess(data.value as string);
      //     return !!game;
      //   } catch (err) {
      //     return false;
      //   }
      // },
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
