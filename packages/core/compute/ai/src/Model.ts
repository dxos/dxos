//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { DXN } from '@dxos/keys';

import * as Provider from './Provider';

/** Characteristics of a model, which may differ between providers serving the same model. */
export type Characteristics = {
  /** Maximum context window, in tokens. */
  readonly contextWindow?: number;
  /** Maximum output tokens per response; when unset the provider's own default applies. */
  readonly maxTokens?: number;
  /** Accepts image input. */
  readonly image?: boolean;
  /** Accepts file/document input. */
  readonly documents?: boolean;
  /** Supports tool calling. */
  readonly tools?: boolean;
  /** Supports extended reasoning ("thinking"). */
  readonly thinking?: boolean;
};

/** Options applied when resolving a model: the subset of {@link Characteristics} a caller can toggle. */
export type Options = Pick<Characteristics, 'thinking'>;

/**
 * A model as served by a single provider. The same model `id` — a developer reverse-DNS NSID name —
 * may be served by several providers, each with its own back-end name and characteristics; that
 * shared `id` is how equivalent models are recognised across providers. `(provider, id)` is the key.
 */
export type Model = {
  /** Canonical model identity: the developer's reverse-DNS NSID name. */
  readonly id: string;
  /** The provider serving this model (a provider NSID name). */
  readonly provider: string;
  /** Provider-specific name passed to the back-end (a pull tag or API model name). */
  readonly backend: string;
  /** Display label for pickers and presets. */
  readonly label: string;
  /** Characteristics, which may vary between providers serving the same model. */
  readonly characteristics?: Characteristics;
};

type MakeOptions = Omit<Model, 'id'>;

/**
 * Constructs a model from its developer-reverse-DNS NSID name. The NSID is validated at compile time
 * — its final segment must be camelCase (no hyphens) — mirroring {@link DXN.make}.
 */
export const make: {
  <Id extends string>(
    nsid: [DXN.Name<Id>] extends [never] ? `Invalid NSID "${Id}": final segment must be camelCase (no hyphens)` : Id,
    options: MakeOptions,
  ): Model;
} = (nsid: string, options: MakeOptions): Model => ({ id: nsid, ...options });

// Local models offered identically by the bundled sidecar (`built-in`), an external `ollama` server,
// and LM Studio — the same curated catalog, each provider serving it under its own back-end name
// (an Ollama pull tag vs an LM Studio model id). https://ollama.com/library https://lmstudio.ai/models
const LOCAL_MODELS = [
  {
    id: 'com.meta.model.llama-3-2-1b.instruct',
    label: 'Llama 3.2 1B',
    ollama: 'llama3.2:1b',
    lmStudio: 'llama-3.2-1b-instruct',
  },
  {
    id: 'com.meta.model.llama-3-2-3b.instruct',
    label: 'Llama 3.2 3B',
    ollama: 'llama3.2:3b',
    lmStudio: 'llama-3.2-3b-instruct',
  },
  { id: 'com.google.model.gemma-4-12b.default', label: 'Gemma 4 12B', ollama: 'gemma4:12b', lmStudio: 'gemma-4-12b' },
  { id: 'com.google.model.gemma-4-26b.default', label: 'Gemma 4 26B', ollama: 'gemma4:26b', lmStudio: 'gemma-4-26b' },
  {
    id: 'com.alibaba.model.qwen-2-5-7b.instruct',
    label: 'Qwen 2.5 7B',
    ollama: 'qwen2.5:7b',
    lmStudio: 'qwen2.5-7b-instruct',
  },
  {
    id: 'com.alibaba.model.qwen-2-5-32b.instruct',
    label: 'Qwen 2.5 32B',
    ollama: 'qwen2.5:32b',
    lmStudio: 'qwen2.5-32b-instruct',
  },
  {
    id: 'com.openai.model.gpt-oss-20b.default',
    label: 'GPT-OSS 20B',
    ollama: 'gpt-oss:20b',
    lmStudio: 'openai/gpt-oss-20b',
  },
] as const;

// Builds the local catalog for one provider, selecting that provider's back-end name per model.
const localModelsFor = (provider: string, backend: (model: (typeof LOCAL_MODELS)[number]) => string): Model[] =>
  LOCAL_MODELS.map((model) => make(model.id, { provider, backend: backend(model), label: model.label }));

/**
 * Curated model catalog. Each entry is a model AS SERVED BY ONE PROVIDER; the same `id` appearing
 * under multiple providers (e.g. `gptOss20b` via Ollama and LM Studio) is intentional — they are the
 * same model served by different back-ends. Local providers extend this set at runtime with
 * installed models tagged with the provider's id.
 */
export const all: readonly Model[] = [
  // Edge — Anthropic Claude via the DXOS edge intermediary.
  make('com.anthropic.model.claude-opus-4-8.default', {
    provider: Provider.edge.id,
    backend: 'claude-opus-4-8',
    label: 'Claude Opus',
    characteristics: { maxTokens: 16_384, thinking: true, tools: true },
  }),
  make('com.anthropic.model.claude-sonnet-4-6.default', {
    provider: Provider.edge.id,
    backend: 'claude-sonnet-4-6',
    label: 'Claude Sonnet',
    characteristics: { maxTokens: 16_384, tools: true },
  }),
  make('com.anthropic.model.claude-haiku-4-5.default', {
    provider: Provider.edge.id,
    backend: 'claude-haiku-4-5',
    label: 'Claude Haiku',
    characteristics: { maxTokens: 16_384, tools: true },
  }),

  // Local models — the same catalog served by the bundled sidecar, an external Ollama server, and
  // LM Studio, each under its own back-end name.
  ...localModelsFor(Provider.builtIn.id, (model) => model.ollama),
  ...localModelsFor(Provider.ollama.id, (model) => model.ollama),
  ...localModelsFor(Provider.lmStudio.id, (model) => model.lmStudio),

  // OpenAI (direct).
  // TODO(wittjosiah): Remove.
  make('com.openai.model.gpt-4o.default', { provider: Provider.openai.id, backend: 'gpt-4o', label: 'GPT-4o' }),
  make('com.openai.model.gpt-4o-mini.default', {
    provider: Provider.openai.id,
    backend: 'gpt-4o-mini',
    label: 'GPT-4o mini',
  }),
];

/** Models served by a given provider. */
export const forProvider = (provider: string): Model[] => all.filter((model) => model.provider === provider);

/** Look up a catalog model by provider and id; `undefined` when the id is not curated for the provider. */
export const get = (provider: string, id: string): Model | undefined =>
  all.find((model) => model.provider === provider && model.id === id);

/** All catalog entries for a model id, across every provider that serves it. */
export const byId = (id: string): Model[] => all.filter((model) => model.id === id);

// Default model per provider, used when no explicit selection is configured.
export const DEFAULT_EDGE = 'com.anthropic.model.claude-sonnet-4-6.default';
export const DEFAULT_OLLAMA = 'com.meta.model.llama-3-2-1b.instruct';
export const DEFAULT_LMSTUDIO = 'com.meta.model.llama-3-2-3b.instruct';

/** Capability flags for a model. */
export type Capabilities = {
  cot?: boolean;
};

export interface Registry {
  getCapabilities(model: string): Capabilities | undefined;
}

// TODO(burdon): Need dynamic registry (that can request available models).
export class MockRegistry implements Registry {
  constructor(private readonly _models: Map<string, Capabilities>) {}

  getCapabilities(model: string) {
    return this._models.get(model);
  }
}
