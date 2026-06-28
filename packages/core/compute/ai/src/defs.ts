//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(burdon): Share with Edge.
export const DEFAULT_EDGE_MODELS = [
  // https://platform.claude.com/docs/en/about-claude/models/overview
  'ai.claude.model.claude-opus-4-8',
  'ai.claude.model.claude-sonnet-4-6',
  'ai.claude.model.claude-haiku-4-5',
  // Older versions (retained for memoized test compatibility).
  'ai.claude.model.claude-opus-4-6',
  'ai.claude.model.claude-opus-4-5',
  'ai.claude.model.claude-opus-4-0',
  'ai.claude.model.claude-sonnet-4-5',
  'ai.claude.model.claude-3-5-haiku-latest',
  'ai.claude.model.claude-3-5-haiku-20241022',
  'ai.claude.model.claude-3-5-sonnet-20241022',
] as const;

/**
 * https://lmstudio.ai/models
 */
export const DEFAULT_LMSTUDIO_MODELS = [
  // prettier-ignore
  'ai.google.model.gemma-3-27b',
  'ai.meta.model.llama-3.1-8b-instruct',
  'ai.meta.model.llama-3.2-3b-instruct',
  'ai.mistral.model.ministral-3-14b-reasoning',
  'ai.openai.model.gpt-oss-20b',
] as const;

/**
 * Curated suggestions offered for one-click pull, paired small/large per family with explicit
 * size tags (no ambiguous `:latest`). Restricted to models that support tool calling, since the
 * assistant relies on tools. Any pulled model still resolves via the open template, so this list
 * only seeds the UI.
 *
 * https://ollama.com/library
 */
export const DEFAULT_OLLAMA_MODELS = [
  // prettier-ignore
  'ai.ollama.model.llama3.2:1b',
  'ai.ollama.model.llama3.2:3b',
  'ai.ollama.model.gemma4:12b',
  'ai.ollama.model.gemma4:31b',
  'ai.ollama.model.qwen2.5:7b',
  'ai.ollama.model.qwen2.5:32b',
  'ai.ollama.model.gpt-oss:20b',
  'ai.ollama.model.gpt-oss:120b',
] as const;

/**
 * https://platform.openai.com/docs/models/overview
 */
export const DEFAULT_OPENAI_MODELS = [
  // prettier-ignore
  'ai.openai.model.gpt-4o',
  'ai.openai.model.gpt-4o-mini',
  'ai.openai.model.o1',
  'ai.openai.model.o3',
  'ai.openai.model.o3-mini',
] as const;

/**
 * Any locally-installed Ollama model id, beyond the curated {@link DEFAULT_OLLAMA_MODELS}. Ollama
 * models are pulled at runtime, so their ids cannot be enumerated; this open template admits them
 * without a cast.
 */
export const OllamaModelId = Schema.TemplateLiteral('ai.ollama.model.', Schema.String);
export type OllamaModelId = typeof OllamaModelId.Type;

// The curated literals stay enumerable (for select fields / autocomplete), unioned with the open
// Ollama template so runtime-pulled models validate and type-check without a cast.
export const ModelName = Schema.Union(
  Schema.Literal(
    ...DEFAULT_EDGE_MODELS,
    ...DEFAULT_LMSTUDIO_MODELS,
    ...DEFAULT_OLLAMA_MODELS,
    ...DEFAULT_OPENAI_MODELS,
  ),
  OllamaModelId,
);

export type ModelName = Schema.Schema.Type<typeof ModelName>;

export const DEFAULT_EDGE_MODEL: ModelName = 'ai.claude.model.claude-sonnet-4-6';
export const DEFAULT_LMSTUDIO_MODEL: ModelName = 'ai.meta.model.llama-3.2-3b-instruct';
export const DEFAULT_OLLAMA_MODEL: ModelName = 'ai.ollama.model.llama3.2:1b';
export const DEFAULT_OPENAI_MODEL: ModelName = 'ai.openai.model.gpt-4o';

export type ModelCapabilities = {
  cot?: boolean;
};

export interface ModelRegistry {
  getCapabilities(model: string): ModelCapabilities | undefined;
}

// TODO(burdon): Need dynamic registry (that can request available models).
//  Remove mapping since IDs aren't consistent across providers.
export class MockModelRegistry implements ModelRegistry {
  constructor(private readonly _models: Map<string, ModelCapabilities>) {}

  getCapabilities(model: string) {
    return this._models.get(model);
  }
}

export interface ModelOptions {
  /**
   * Enable thinking.
   */
  thinking?: boolean;
}
