//
// Copyright 2025 DXOS.org
//

import { type S, type ObjectId } from '@dxos/echo-schema';

import { type LLMTool } from './schema';

// TODO(burdon): Rename LLM => AI?

export type Artifact = {
  id: ObjectId;
  prompt: string;
  schema: S.Schema.AnyNoContext;
  tools: LLMTool[];
};

export const defineArtifact = (artifact: Artifact): Artifact => artifact;
