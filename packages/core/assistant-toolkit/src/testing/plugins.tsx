//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';
import { Format, type Obj, Type } from '@dxos/echo';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

export const MapSchema = Schema.Struct({
  coordinates: Format.GeoPoint,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Map',
    version: '0.1.0',
  }),
);

export type MapSchema = Schema.Schema.Type<typeof MapSchema>;

// TODO(burdon): Move to ECHO def.
export type ArtifactsContext = {
  items: Obj.Any[];
  getArtifacts: () => Obj.Any[];
  addArtifact: (artifact: Obj.Any) => void;
};

declare global {
  interface ToolContextExtensions {
    artifacts?: ArtifactsContext;
  }
}

// TODO(dmaretskyi): Removed images from conductor GPT implementation.
const isImage = (data: any): data is any => false;

export const capabilities: Capability.Any[] = [
  Capability.contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-image',
      role: 'card--extrinsic',
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
  // Default
  //
  Capability.contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-default',
      role: 'card--extrinsic',
      position: 'fallback',
      component: ({ data }) => <JsonFilter data={data} />,
    }),
  ),
];
