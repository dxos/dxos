//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(burdon): Share with Edge.
// TOOD(burdon): Clean-up deprecated models.
export const DEFAULT_EDGE_MODELS = [
  // AI Gateway.
  // https://developers.cloudflare.com/ai-gateway
  '@anthropic/claude-3-5-haiku-latest',
  '@anthropic/claude-3-5-haiku-20241022',
  '@anthropic/claude-3-5-sonnet-20241022',
  '@anthropic/claude-opus-4-0',
  '@anthropic/claude-opus-4-5',
  '@anthropic/claude-haiku-4-5',
  '@anthropic/claude-sonnet-4-0',
  '@anthropic/claude-sonnet-4-5',

  // Workers AI.
  // https://developers.cloudflare.com/workers-ai/models
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@ollama/llama-3-1-nemotron-70b-instruct',
  '@ollama/llama-3-1-nemotron-mini-4b-instruct',
  '@ollama/llama-3-2-3b',
] as const;

/**
 * https://platform.openai.com/docs/models/overview
 */
export const DEFAULT_OPENAI_MODELS = [
  // prettier-ignore
  '@openai/gpt-4o',
  '@openai/gpt-4o-mini',
  '@openai/o1',
  '@openai/o3',
  '@openai/o3-mini',
] as const;

/**
 * https://ollama.com/library
 */
export const DEFAULT_OLLAMA_MODELS = [
  // prettier-ignore
  'qwen2.5:14b', // Test function calling?
  'llama3.2:1b',
  'llama3:70b',
  'deepseek-r1:latest',
] as const;

/**
 * https://lmstudio.ai/models
 */
export const DEFAULT_LMSTUDIO_MODELS = [
  // prettier-ignore
  '@google/gemma-3-27b',
  '@meta/llama-3.2-3b-instruct',
] as const;

export const ModelName = Schema.Literal(
  ...DEFAULT_EDGE_MODELS,
  ...DEFAULT_OPENAI_MODELS,
  ...DEFAULT_OLLAMA_MODELS,
  ...DEFAULT_LMSTUDIO_MODELS,
);

export type ModelName = Schema.Schema.Type<typeof ModelName>;

export const DEFAULT_EDGE_MODEL: ModelName = '@anthropic/claude-sonnet-4-5';
export const DEFAULT_OPENAI_MODEL: ModelName = '@openai/gpt-4o';
export const DEFAULT_OLLAMA_MODEL: ModelName = 'llama3.2:1b';
export const DEFAULT_LMSTUDIO_MODEL: ModelName = '@google/gemma-3-27b';

export type ModelCapabilities = {
  cot?: boolean;
};

export interface ModelRegistry {
  getCapabilities(model: string): ModelCapabilities | undefined;
}

export class MockModelRegistry implements ModelRegistry {
  constructor(private readonly _models: Map<string, ModelCapabilities>) {}

  getCapabilities(model: string) {
    return this._models.get(model);
  }
}
