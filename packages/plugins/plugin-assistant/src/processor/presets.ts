//
// Copyright 2025 DXOS.org
//

import { MODELS, type ModelName, PROVIDERS, type Provider } from '@dxos/ai';

/**
 * A chat preset: a curated model offered for a provider, with a display label. Derived from the
 * {@link MODELS} catalog — see {@link presetsForProvider}.
 */
export type AiServicePreset = {
  id: string;
  provider: Provider;
  model: ModelName;
  label: string;
};

/**
 * Curated, recommended presets for a provider, derived from the model catalog: the models whose
 * source matches the provider's, flagged `recommended`. `built-in` and `ollama` share the `ollama`
 * source, so both surface the same curated Ollama models.
 */
export const presetsForProvider = (provider: Provider): AiServicePreset[] =>
  MODELS.filter((model) => model.source === PROVIDERS[provider].source && model.recommended).map((model) => ({
    id: model.id,
    provider,
    model: model.id,
    label: model.label,
  }));

/**
 * Reconcile a stored provider with the runtime: the bundled sidecar (`built-in`) and an external
 * server (`ollama`) share the `ollama` source but are environment-exclusive — the sidecar exists
 * only on desktop. Map a stored value onto whichever is actually available so a legacy `ollama`
 * setting resolves to the sidecar on desktop (and vice-versa on the web).
 */
export const resolveProvider = (provider: Provider | undefined, hasBuiltIn: boolean): Provider => {
  const resolved = provider ?? 'edge';
  if (resolved === 'ollama' && hasBuiltIn) {
    return 'built-in';
  }
  if (resolved === 'built-in' && !hasBuiltIn) {
    return 'ollama';
  }
  return resolved;
};
