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
 * The preset a chat settles on: the configured default when the list still offers it, else the
 * first available one.
 */
export const pickPreset = (presets: readonly AiServicePreset[], defaultModel?: string): AiServicePreset | undefined =>
  (defaultModel ? presets.find((preset) => preset.model === defaultModel) : undefined) ?? presets[0];

/**
 * The preset a chat runs with, derived from settings alone — what `usePresets` settles on once its
 * effects have run.
 *
 * Exported for callers outside React that start a turn on a chat's behalf (delegation, a routine):
 * `AgentService` binds the model to the agent process at spawn, and tears that process down when a
 * later caller asks for a different one — so a session started with anything but this interrupts
 * itself the moment the chat's own UI mounts. Availability filtering (installed sidecar models, a
 * reachable LM Studio) is the UI's; this answers from the catalog, which is exact for `edge` and
 * the configured default everywhere else.
 */
export const defaultPreset = (
  settings: { modelProvider?: string; modelDefaults?: Record<string, string | undefined> },
  options?: { hasBuiltIn?: boolean },
): AiServicePreset | undefined => {
  const provider = resolveProvider(settings.modelProvider, options?.hasBuiltIn ?? false);
  return pickPreset(presetsForProvider(provider), settings.modelDefaults?.[defaultsKeyForProvider(provider)]);
};

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
