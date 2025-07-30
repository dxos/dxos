//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ContentBlock, DataType } from '@dxos/schema';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS, DEFAULT_LMSTUDIO_MODELS, DEFAULT_OPENAI_MODELS } from './defs';
import { Tool } from './tools';

// TODO(dmaretskyi): Rename `ModelName`.
export const LLMModel = Schema.Literal(
  ...DEFAULT_EDGE_MODELS,
  ...DEFAULT_OLLAMA_MODELS,
  ...DEFAULT_LMSTUDIO_MODELS,
  ...DEFAULT_OPENAI_MODELS,
);

export type LLMModel = Schema.Schema.Type<typeof LLMModel>;
