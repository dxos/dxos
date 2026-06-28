//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Which resolver/back-end serves a model (selects the API surface used to reach it). */
export type ModelSource = 'edge' | 'ollama' | 'lmstudio' | 'openai';

/** Metadata for a curated model, keyed by id in {@link MODEL_META}. */
export type ModelInfo = {
  /** Resolver/back-end that serves the model. */
  readonly source: ModelSource;
  /** Model name passed to the back-end by the resolver. */
  readonly backend: string;
  /** Display label for pickers and presets. */
  readonly label: string;
  /** Offered as a default chat preset. */
  readonly recommended?: boolean;
  /** Enable Anthropic adaptive thinking (Opus models). */
  readonly thinking?: boolean;
};

// Curated model ids. The literal source for {@link ModelName}; runtime-pulled Ollama models are
// admitted separately via {@link OllamaModelId}.
const MODEL_IDS = [
  // Edge (Anthropic Claude via DXOS edge). Older versions retained for memoized-test compatibility.
  'ai.claude.model.claude-opus-4-8',
  'ai.claude.model.claude-sonnet-4-6',
  'ai.claude.model.claude-haiku-4-5',
  'ai.claude.model.claude-opus-4-6',
  'ai.claude.model.claude-opus-4-5',
  'ai.claude.model.claude-opus-4-0',
  'ai.claude.model.claude-sonnet-4-5',
  'ai.claude.model.claude-3-5-haiku-latest',
  'ai.claude.model.claude-3-5-haiku-20241022',
  'ai.claude.model.claude-3-5-sonnet-20241022',
  // Ollama (built-in sidecar or external Ollama). Curated one-click pulls, tool-calling only,
  // paired small/large per family with explicit size tags. https://ollama.com/library
  'ai.ollama.model.llama3.2:1b',
  'ai.ollama.model.llama3.2:3b',
  'ai.ollama.model.gemma4:12b',
  'ai.ollama.model.gemma4:26b',
  'ai.ollama.model.qwen2.5:7b',
  'ai.ollama.model.qwen2.5:32b',
  'ai.ollama.model.gpt-oss:20b',
  // LM Studio (OpenAI-compatible local server). https://lmstudio.ai/models
  'ai.google.model.gemma-3-27b',
  'ai.meta.model.llama-3.1-8b-instruct',
  'ai.meta.model.llama-3.2-3b-instruct',
  'ai.mistral.model.ministral-3-14b-reasoning',
  'ai.openai.model.gpt-oss-20b',
  // OpenAI (resolver available to the CLI/tests; not surfaced as a desktop provider).
  'ai.openai.model.gpt-4o',
  'ai.openai.model.gpt-4o-mini',
  'ai.openai.model.o1',
  'ai.openai.model.o3',
  'ai.openai.model.o3-mini',
] as const;

/** Prefix shared by all Ollama model ids; the suffix is the raw `ollama pull` / installed name. */
export const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

/**
 * Any locally-installed Ollama model id, beyond the curated catalog. Ollama models are pulled at
 * runtime, so their ids cannot be enumerated; this open template admits them without a cast.
 */
export const OllamaModelId = Schema.TemplateLiteral(OLLAMA_MODEL_PREFIX, Schema.String);
export type OllamaModelId = typeof OllamaModelId.Type;

export type ModelName = (typeof MODEL_IDS)[number] | OllamaModelId;

// The curated literals stay enumerable (for select fields / autocomplete), unioned with the open
// Ollama template so runtime-pulled models validate and type-check without a cast.
export const ModelName = Schema.Union(Schema.Literal(...MODEL_IDS), OllamaModelId);

/**
 * Single source of truth for curated-model metadata, keyed by id. A `Record` over the id union, so
 * the compiler requires an entry for every {@link MODEL_IDS} member (and rejects stragglers). The
 * {@link ModelName} union, per-source default lists, chat presets, and each resolver's model map
 * all derive from this — there is no second list to keep in sync.
 */
export const MODEL_META: Record<(typeof MODEL_IDS)[number], ModelInfo> = {
  'ai.claude.model.claude-opus-4-8': { source: 'edge', backend: 'claude-opus-4-8', label: 'Claude Opus', recommended: true, thinking: true }, // prettier-ignore
  'ai.claude.model.claude-sonnet-4-6': { source: 'edge', backend: 'claude-sonnet-4-6', label: 'Claude Sonnet', recommended: true }, // prettier-ignore
  'ai.claude.model.claude-haiku-4-5': { source: 'edge', backend: 'claude-haiku-4-5', label: 'Claude Haiku', recommended: true }, // prettier-ignore
  'ai.claude.model.claude-opus-4-6': { source: 'edge', backend: 'claude-opus-4-6', label: 'Claude Opus 4.6', thinking: true }, // prettier-ignore
  'ai.claude.model.claude-opus-4-5': { source: 'edge', backend: 'claude-opus-4-5', label: 'Claude Opus 4.5', thinking: true }, // prettier-ignore
  'ai.claude.model.claude-opus-4-0': { source: 'edge', backend: 'claude-opus-4-0', label: 'Claude Opus 4.0', thinking: true }, // prettier-ignore
  'ai.claude.model.claude-sonnet-4-5': { source: 'edge', backend: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }, // prettier-ignore
  'ai.claude.model.claude-3-5-haiku-latest': { source: 'edge', backend: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' }, // prettier-ignore
  'ai.claude.model.claude-3-5-haiku-20241022': { source: 'edge', backend: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (2024-10-22)' }, // prettier-ignore
  'ai.claude.model.claude-3-5-sonnet-20241022': { source: 'edge', backend: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (2024-10-22)' }, // prettier-ignore
  'ai.ollama.model.llama3.2:1b': { source: 'ollama', backend: 'llama3.2:1b', label: 'Llama 3.2 1B' }, // prettier-ignore
  'ai.ollama.model.llama3.2:3b': { source: 'ollama', backend: 'llama3.2:3b', label: 'Llama 3.2 3B', recommended: true }, // prettier-ignore
  'ai.ollama.model.gemma4:12b': { source: 'ollama', backend: 'gemma4:12b', label: 'Gemma 4 12B' }, // prettier-ignore
  'ai.ollama.model.gemma4:26b': { source: 'ollama', backend: 'gemma4:26b', label: 'Gemma 4 26B' }, // prettier-ignore
  'ai.ollama.model.qwen2.5:7b': { source: 'ollama', backend: 'qwen2.5:7b', label: 'Qwen 2.5 7B' }, // prettier-ignore
  'ai.ollama.model.qwen2.5:32b': { source: 'ollama', backend: 'qwen2.5:32b', label: 'Qwen 2.5 32B' }, // prettier-ignore
  'ai.ollama.model.gpt-oss:20b': { source: 'ollama', backend: 'gpt-oss:20b', label: 'GPT-OSS 20B', recommended: true }, // prettier-ignore
  'ai.google.model.gemma-3-27b': { source: 'lmstudio', backend: 'google/gemma-3-27b', label: 'Gemma 3 27B' }, // prettier-ignore
  'ai.meta.model.llama-3.1-8b-instruct': { source: 'lmstudio', backend: 'meta-llama-3.1-8b-instruct', label: 'Llama 3.1 8B' }, // prettier-ignore
  'ai.meta.model.llama-3.2-3b-instruct': { source: 'lmstudio', backend: 'llama-3.2-3b-instruct', label: 'Llama 3.2 3B', recommended: true }, // prettier-ignore
  'ai.mistral.model.ministral-3-14b-reasoning': { source: 'lmstudio', backend: 'ministral-3-14b-reasoning', label: 'Ministral 3 14B' }, // prettier-ignore
  'ai.openai.model.gpt-oss-20b': { source: 'lmstudio', backend: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', recommended: true }, // prettier-ignore
  'ai.openai.model.gpt-4o': { source: 'openai', backend: 'gpt-4o', label: 'GPT-4o' }, // prettier-ignore
  'ai.openai.model.gpt-4o-mini': { source: 'openai', backend: 'gpt-4o-mini', label: 'GPT-4o mini' }, // prettier-ignore
  'ai.openai.model.o1': { source: 'openai', backend: 'o1', label: 'o1' }, // prettier-ignore
  'ai.openai.model.o3': { source: 'openai', backend: 'o3', label: 'o3' }, // prettier-ignore
  'ai.openai.model.o3-mini': { source: 'openai', backend: 'o3-mini', label: 'o3 mini' }, // prettier-ignore
};

/** A curated model: its id joined with its {@link MODEL_META} entry. */
export type Model = { readonly id: ModelName } & ModelInfo;

/** All curated models, in declaration order. */
export const MODELS: readonly Model[] = MODEL_IDS.map((id) => ({ id, ...MODEL_META[id] }));

const MODEL_BY_ID = new Map<string, Model>(MODELS.map((model) => [model.id, model]));

/** Look up a curated model by id; `undefined` for runtime-pulled ids not in the catalog. */
export const getModel = (id: string): Model | undefined => MODEL_BY_ID.get(id);

/** Curated models served by a given source. */
export const modelsBySource = (source: ModelSource): Model[] =>
  MODELS.filter((model) => model.source === source);

/** Curated model ids served by a given source. */
export const modelsForSource = (source: ModelSource): ModelName[] =>
  modelsBySource(source).map((model) => model.id);

// Per-source curated id lists, derived from the catalog.
export const DEFAULT_EDGE_MODELS = modelsForSource('edge');
export const DEFAULT_OLLAMA_MODELS = modelsForSource('ollama');
export const DEFAULT_LMSTUDIO_MODELS = modelsForSource('lmstudio');
export const DEFAULT_OPENAI_MODELS = modelsForSource('openai');

export const DEFAULT_EDGE_MODEL: ModelName = 'ai.claude.model.claude-sonnet-4-6';
export const DEFAULT_LMSTUDIO_MODEL: ModelName = 'ai.meta.model.llama-3.2-3b-instruct';
export const DEFAULT_OLLAMA_MODEL: ModelName = 'ai.ollama.model.llama3.2:1b';
export const DEFAULT_OPENAI_MODEL: ModelName = 'ai.openai.model.gpt-4o';

/**
 * User-selectable LLM providers. `built-in` is the bundled, managed local sidecar (its back-end is
 * an implementation detail — currently Ollama — so it is not branded "Ollama"); `ollama` is an
 * external, user-run Ollama server. Both serve the `ollama` model source via different endpoints.
 */
export const PROVIDER_IDS = ['edge', 'built-in', 'ollama', 'lmstudio'] as const;

export type Provider = (typeof PROVIDER_IDS)[number];

export type ProviderInfo = {
  /** Model source whose models this provider serves. */
  readonly source: ModelSource;
  /** Default base URL (omitted for `edge`, which is reached via the identity-aware edge client). */
  readonly endpoint?: string;
  /** True for the bundled sidecar whose lifecycle the app manages. */
  readonly managed?: boolean;
};

/**
 * The single registry mapping each user-facing {@link Provider} to its model source, endpoint, and
 * managed flag. Replaces the scattered provider-name translation tables and label-switching.
 */
export const PROVIDERS: Record<Provider, ProviderInfo> = {
  edge: { source: 'edge' },
  'built-in': { source: 'ollama', endpoint: 'http://localhost:21434', managed: true },
  ollama: { source: 'ollama', endpoint: 'http://localhost:11434' },
  lmstudio: { source: 'lmstudio', endpoint: 'http://localhost:1234' },
};

export type ModelCapabilities = {
  cot?: boolean;
};

export interface ModelRegistry {
  getCapabilities(model: string): ModelCapabilities | undefined;
}

// TODO(burdon): Need dynamic registry (that can request available models).
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
