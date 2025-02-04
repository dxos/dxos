//
// Copyright 2025 DXOS.org
//

import { type S, type ObjectId } from '@dxos/echo-schema';

import { type Tool } from './tools';

/**
 *
 */
export type ArtifactDefinition = {
  // TODO(wittjosiah): Is this actually an ObjectId or should it be a uri?
  id: ObjectId;

  /**
   * Instructions for how to use the artifact.
   */
  instructions: string;

  /**
   * Schema that describes the shape of data which matches the artifact.
   */
  schema: S.Schema.AnyNoContext;

  /**
   * Tools that can be used to act on data which matches the artifact.
   */
  tools: Tool[];

  // TODO(wittjosiah): Add `component` field for rendering data which matches the artifact?
  //  NOTE(burdon): I think that could just be provided separately by the plugin (since there might be multiple surface types).
};

export const defineArtifact = (definition: ArtifactDefinition): ArtifactDefinition => definition;
