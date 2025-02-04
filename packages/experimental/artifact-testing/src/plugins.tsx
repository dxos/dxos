//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';
import React from 'react';

import { Capabilities, contributes, createSurface, type AnyCapability } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { isImage } from '@dxos/conductor';
import { EchoObject, GeoPoint, ObjectId, type HasId, type HasTypename } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

export const MapSchema = S.Struct({
  coordinates: GeoPoint,
}).pipe(EchoObject('example.com/type/Map', '0.1.0')) as any as S.Schema<{ id: ObjectId; coordinates: GeoPoint }>; // TODO(dmaretskyi): Fix the tuples/mutable issues.

export type MapSchema = S.Schema.Type<typeof MapSchema>;

// TODO(burdon): Move ot ECHO def.
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

export const genericTools = [
  defineTool({
    name: 'focus',
    description: 'Focus on the given artifact. Use this tool to bring the artifact to the front of the canvas.',
    schema: S.Struct({ id: ObjectId }),
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
      id: 'plugin-image',
      instructions: `
    Images:
    - When presenting an image, you must use an artifact.
    - Nest the <image> tag inside the <artifact> tag.
    - Image tags are always self-closing and must contain an id attribute.
    (Example: <artifact><image id="unique_identifier" prompt="..." /></artifact>)
    `,
      schema: S.Struct({}), // TODO(burdon): Add schema.
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
      disposition: 'fallback',
      component: ({ role, data }) => <JsonFilter data={data} />,
    }),
  ),
];
