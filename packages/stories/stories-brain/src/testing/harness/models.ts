//
// Copyright 2026 DXOS.org
//

import { Provider } from '@dxos/ai';
import { type AiServicePreset } from '@dxos/ai/testing';
import { type DXN } from '@dxos/keys';

import { MODELS } from './config';

/**
 * A model configuration to benchmark. `preset` selects the AI backend layer and `provider` the model
 * catalog routing (defaults to edge, so ollama models MUST pass their provider); `strict` toggles
 * strict structured-output generation (local models reliably fail the strict path, so run lenient).
 */
export type ModelVariant = {
  readonly name: string;
  readonly model: string;
  readonly provider: DXN.DXN;
  readonly preset: AiServicePreset;
  readonly strict: boolean;
};

// Three local models (Ollama, from pipeline-email/scripts/pull-models.sh) and three remote Claude
// tiers (Anthropic direct via DX_ANTHROPIC_API_KEY). Anthropic models declare `provider: edge` in
// the catalog; the `direct` preset just points the client at the Anthropic endpoint.
export const LOCAL_VARIANTS: readonly ModelVariant[] = [
  {
    name: 'llama-3.2-3b',
    model: 'com.meta.model.llama-3-2-3b.instruct',
    provider: Provider.ollama.id,
    preset: 'ollama',
    strict: false,
  },
  {
    name: 'qwen-2.5-7b',
    model: 'com.alibaba.model.qwen-2-5-7b.instruct',
    provider: Provider.ollama.id,
    preset: 'ollama',
    strict: false,
  },
  {
    name: 'gemma-4-12b',
    model: 'com.google.model.gemma-4-12b.default',
    provider: Provider.ollama.id,
    preset: 'ollama',
    strict: false,
  },
];

export const REMOTE_VARIANTS: readonly ModelVariant[] = [
  {
    name: 'claude-haiku',
    model: 'com.anthropic.model.claude-haiku-4-5.default',
    provider: Provider.edge.id,
    preset: 'direct',
    strict: true,
  },
  {
    name: 'claude-sonnet',
    model: 'com.anthropic.model.claude-sonnet-4-6.default',
    provider: Provider.edge.id,
    preset: 'direct',
    strict: true,
  },
  {
    name: 'claude-opus',
    model: 'com.anthropic.model.claude-opus-4-8.default',
    provider: Provider.edge.id,
    preset: 'direct',
    strict: true,
  },
];

export const ALL_VARIANTS: readonly ModelVariant[] = [...LOCAL_VARIANTS, ...REMOTE_VARIANTS];

/**
 * Resolves the variant set for a run. `MODELS` (comma-separated name substrings) filters the set —
 * e.g. `MODELS=llama,haiku`; `MODELS=local` / `MODELS=remote` select a tier. Defaults to all six.
 */
export const selectVariants = (): readonly ModelVariant[] => {
  const raw = MODELS;
  if (!raw) {
    return ALL_VARIANTS;
  }
  if (raw === 'local') {
    return LOCAL_VARIANTS;
  }
  if (raw === 'remote') {
    return REMOTE_VARIANTS;
  }
  const names = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return ALL_VARIANTS.filter((variant) => names.some((name) => variant.name.includes(name)));
};
