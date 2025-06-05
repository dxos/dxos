//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React from 'react';

import { defineTool, ToolResult } from '@dxos/ai';
import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { isImage } from '@dxos/conductor';
import { Format, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

export const MapSchema = Schema.Struct({
  coordinates: Format.GeoPoint,
}).pipe(
  Type.def({
    typename: 'example.com/type/Map',
    version: '0.1.0',
  }),
);

export type MapSchema = Schema.Schema.Type<typeof MapSchema>;

// TODO(burdon): Move to ECHO def.
export type ArtifactsContext = {
  items: Type.AnyObject[];
  getArtifacts: () => Type.AnyObject[];
  addArtifact: (artifact: Type.AnyObject) => void;
};

declare global {
  interface ToolContextExtensions {
    artifacts?: ArtifactsContext;
  }
}

export const genericTools = [
  defineTool('testing', {
    name: 'focus',
    description: 'Focus on the given artifact. Use this tool to bring the artifact to the front of the canvas.',
    schema: Schema.Struct({ id: Type.ObjectId }),
    execute: async ({ id }, { extensions }) => {
      invariant(extensions?.artifacts, 'No artifacts context');
      const artifactIndex = extensions.artifacts.items.findIndex((artifact) => artifact.id === id);
      if (artifactIndex !== -1) {
        extensions.artifacts.items = [
          ...extensions.artifacts.items.filter((artifact) => artifact.id !== id),
          extensions.artifacts.items[artifactIndex],
        ];
      }

      return ToolResult.Success(createArtifactElement(id));
    },
  }),
];

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
  // Default
  //
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'plugin-default',
      role: 'canvas-node',
      position: 'fallback',
      component: ({ role, data }) => <JsonFilter data={data} />,
    }),
  ),
];
