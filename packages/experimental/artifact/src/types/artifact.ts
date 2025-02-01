//
// Copyright 2025 DXOS.org
//

import { type S, type ObjectId } from '@dxos/echo-schema';

import { type Tool } from './schema';

/**
 *
 */
export type Artifact = {
  // TODO(wittjosiah): Is this actually an ObjectId or should it be a uri?
  id: ObjectId;

  /**
   *
   */
  // TODO(wittjosiah): Rename to `instructions`?
  prompt: string;

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

export const defineArtifact = (artifact: Artifact): Artifact => artifact;
