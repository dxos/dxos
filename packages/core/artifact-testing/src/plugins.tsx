//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { Type, type Obj } from '@dxos/echo';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

export const MapSchema = Schema.Struct({
  coordinates: Type.Format.GeoPoint,
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

export const capabilities: AnyCapability[] = [
  //
  // Image
  //
  contributes(
    Capabilities.ArtifactDefinition,
    defineArtifact({
      id: 'artifact:dxos.org/plugin/image',
      name: 'Image',
      instructions: `
        - When presenting an image, you must use an artifact.
        - Nest the <image> tag inside the <artifact> tag.
        - Image tags are always self-closing and must contain an id attribute.
          (Example: <artifact><image id="unique_identifier" prompt="..." /></artifact>)
      `,
      schema: Schema.Struct({}), // TODO(burdon): Add schema.
      tools: [],
    }),
  ),
  contributes(
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
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-default',
      role: 'card--extrinsic',
      position: 'fallback',
      component: ({ role, data }) => <JsonFilter data={data} />,
    }),
  ),
];
