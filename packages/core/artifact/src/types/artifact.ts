//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { type ExecutableTool } from '@dxos/ai';

/**
 * Static artifact definition.
 */
// TODO(burdon): Convert to effect schema.
export type ArtifactDefinition = {
  // TODO(wittjosiah): Is this actually an ObjectId or should it be a uri?
  // TODO(burdon): Plugin id?
  id: string;

  /**
   * Name.
   */
  name: string;

  /**
   * Description.
   */
  description?: string;

  /**
   * Instructions for how to use the artifact.
   */
  // TODO(burdon): Reference template object.
  instructions: string;

  /**
   * Schema that describes the shape of data which matches the artifact.
   */
  schema: Schema.Schema.AnyNoContext;

  /**
   * Tools that can be used to act on data which matches the artifact.
   */
  tools: ExecutableTool[];

  // TODO(wittjosiah): Add `component` field for rendering data which matches the artifact?
  //  NOTE(burdon): I think that could just be provided separately by the plugin (since there might be multiple surface types).
};

export const defineArtifact = (definition: ArtifactDefinition): ArtifactDefinition => definition;
