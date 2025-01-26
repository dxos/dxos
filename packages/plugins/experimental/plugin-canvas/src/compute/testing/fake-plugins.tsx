//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { isImage } from '@dxos/conductor';
import { Chessboard } from '@dxos/plugin-chess';
import { MapControl } from '@dxos/plugin-map';

import { JsonFilter } from '../../components';

// TODO(burdon): Rename Capability.Any.
export const capabilities: AnyCapability[] = [
  //
  // Image
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-iamge',
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
      filter: (data: any): data is any => false,
      component: ({ role, data }) => <MapControl />,
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
