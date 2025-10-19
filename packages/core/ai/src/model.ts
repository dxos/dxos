//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DEFAULT_EDGE_MODELS, DEFAULT_LMSTUDIO_MODELS, DEFAULT_OLLAMA_MODELS, DEFAULT_OPENAI_MODELS } from './defs';

export type ModelCapabilities = {
  cot?: boolean;
};

export const ModelName = Schema.Literal(
  ...DEFAULT_EDGE_MODELS,
  ...DEFAULT_OLLAMA_MODELS,
  ...DEFAULT_LMSTUDIO_MODELS,
  ...DEFAULT_OPENAI_MODELS,
);

export type ModelName = Schema.Schema.Type<typeof ModelName>;

export interface ModelRegistry {
  getCapabilities(model: string): ModelCapabilities | undefined;
}

export class MockModelRegistry implements ModelRegistry {
  constructor(private readonly _models: Map<string, ModelCapabilities>) {}

  getCapabilities(model: string) {
    return this._models.get(model);
  }
}
