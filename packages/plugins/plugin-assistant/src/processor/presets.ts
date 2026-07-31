//
// Copyright 2025 DXOS.org
//

import { Model, Provider } from '@dxos/ai';
import { DXN } from '@dxos/keys';

/**
 * A chat preset: a model offered for a provider, with a display label. Derived from the {@link Model}
 * catalog — see {@link presetsForProvider}.
 */
export type AiServicePreset = {
  id: string;
  provider: DXN.DXN;
  model: DXN.DXN;
  /** Provider-specific back-end name (e.g. an Ollama pull tag); used to match installed models. */
  backend: string;
  label: string;
};

/** Presets for a provider: every model the provider serves (the catalog filtered by provider). */
export const presetsForProvider = (provider: DXN.DXN): AiServicePreset[] =>
  Model.forProvider(provider).map((model) => ({
    id: model.id,
    provider,
    model: model.id,
    backend: model.backend,
    label: model.label,
  }));

/**
 * Reconcile a stored provider DXN with the runtime: map the bundled sidecar (`built-in`) and an
 * external server (`ollama`) onto whichever is actually available — they are environment-exclusive
 * (the sidecar exists only on desktop). Defaults to `edge` when unset or unparseable.
 */
export const resolveProvider = (provider: string | undefined, hasBuiltIn: boolean): DXN.DXN => {
  const resolved = (provider ? DXN.tryMake(provider) : undefined) ?? Provider.edge.id;
  if (resolved === Provider.ollama.id && hasBuiltIn) {
    return Provider.builtIn.id;
  }
  if (resolved === Provider.builtIn.id && !hasBuiltIn) {
    return Provider.ollama.id;
  }
  return resolved;
};

/** The {@link Settings.modelDefaults} key for a provider (`built-in` shares the `ollama` key). */
export const defaultsKeyForProvider = (provider: DXN.DXN): 'edge' | 'ollama' | 'lmstudio' =>
  provider === Provider.edge.id ? 'edge' : provider === Provider.lmStudio.id ? 'lmstudio' : 'ollama';
