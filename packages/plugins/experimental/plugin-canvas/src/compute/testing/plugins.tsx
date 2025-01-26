//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import jp from 'jsonpath';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { isImage } from '@dxos/conductor';
import { Chessboard } from '@dxos/plugin-chess';
import { MapControl } from '@dxos/plugin-map';
import { safeParseJson } from '@dxos/util';

import { JsonFilter } from '../../components';

export type Artifact = {
  id: string;
  prompt: string;
};

export const createArtifact = (artifact: Artifact): Artifact => artifact;

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
  }),
  createArtifact({
    id: 'plugin-chess',
    prompt: `
    Chess:
    - If the user's message relates to a chess game, you must return the chess game as a valid FEN string with no additional text.
    `,
  }),
  createArtifact({
    id: 'plugin-map',
    prompt: `
    Maps:
    - If the user's message relates to a map, you must return the map as a valid GeoJSON Point with valid coordinates.
    `,
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
      filter: (data: any): data is any => {
        if (typeof data.value !== 'string') {
          return false;
        }
        try {
          new Chess(data.value).fen();
          return true;
        } catch (err) {
          return false;
        }
      },
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
      filter: (data: any): data is any => {
        const json = safeParseJson(data.value);
        const coordinates = jp.query(json, '$..coordinates');
        return !!coordinates.length;
      },
      component: ({ role, data }) => {
        const json = safeParseJson(data.value);
        const [lng, lat] = jp.query(json, '$..coordinates')[0];
        return <MapControl center={{ lat, lng }} />;
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
