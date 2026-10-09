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
 * The model a chat runs on when settings name none — chosen explicitly rather than inherited from the
 * catalog's order, whose first edge entry is the most expensive model.
 */
export const DEFAULT_MODEL: DXN.DXN = Model.claudeSonnet5.id;

/**
 * The preset a chat settles on: the configured default when the list still offers it, else
 * {@link DEFAULT_MODEL}, else the first available one.
 */
export const pickPreset = (presets: readonly AiServicePreset[], defaultModel?: string): AiServicePreset | undefined =>
  (defaultModel ? presets.find((preset) => preset.model === defaultModel) : undefined) ??
  presets.find((preset) => preset.model === DEFAULT_MODEL) ??
  presets[0];

/**
 * The preset a chat with no model of its own falls back to, derived from settings alone — what
 * `usePresets` shows for such a chat.
 *
 * Exported for callers outside React that start a turn on a chat's behalf (delegation, a routine):
 * the agent process is bound to the model on the chat, so a caller stamping anything but this onto
 * an unselected chat would change what its own UI then shows. Availability filtering (installed
 * sidecar models, a reachable LM Studio) is the UI's; this answers from the catalog, which is exact
 * for `edge` and the configured default everywhere else.
 */
export const defaultPreset = (
  settings: { modelProvider?: string; modelDefaults?: Record<string, string | undefined> },
  options?: { hasBuiltIn?: boolean },
): AiServicePreset | undefined => {
  const provider = resolveProvider(settings.modelProvider, options?.hasBuiltIn ?? false);
  return pickPreset(presetsForProvider(provider), settings.modelDefaults?.[defaultsKeyForProvider(provider)]);
};

/**
 * The provider to resolve `model` through, given the one settings currently select. Model ids are
 * provider-scoped, so a chat that kept a selection across a provider change (it picked Claude, then
 * the user went offline) would otherwise be handed a provider that does not serve it and fail to
 * resolve. The active provider wins whenever it serves the model — several providers serve the same
 * local model ids, and the catalog's first entry is not necessarily the live one.
 */
export const providerForModel = (model: DXN.DXN, active: DXN.DXN | undefined): DXN.DXN | undefined =>
  active && Model.get(active, model) ? active : (Model.byId(model)[0]?.provider ?? active);

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
