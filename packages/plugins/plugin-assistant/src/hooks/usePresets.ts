//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { LMStudioResolver } from '@dxos/ai/resolvers';
import { useOptionalCapability } from '@dxos/app-framework/ui';

import { type Assistant, AssistantCapabilities, type ChatPresetProps, type Ollama } from '#types';

import { type AiServicePreset, AiServicePresets } from '../processor';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<ChatPresetProps, 'presets' | 'onPresetChange'>;

/** Prefix shared by all Ollama model ids; the suffix is the installed model name. */
const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

/** Maps the user-facing LLM provider setting onto the preset `provider` tag. */
const PRESET_PROVIDER: Record<Assistant.ModelProvider, AiServicePreset['provider']> = {
  edge: 'dxos-remote',
  ollama: 'ollama',
  lmstudio: 'lm-studio',
};

// Stable fallback so `useAtomValue` is always called with a valid atom when the (desktop-only)
// Ollama manager capability is absent.
const EMPTY_OLLAMA_STATE: Ollama.ModelsState = { kind: 'idle', models: [], pulls: {} };
const emptyStateAtom = Atom.make(EMPTY_OLLAMA_STATE);

/**
 * Resolves the chat model presets for the provider selected in settings ({@link Assistant.Settings.modelProvider}),
 * defaulting the selection to the configured per-provider model. The legacy online toggle no longer
 * drives selection.
 */
export const usePresets = (settings: Assistant.Settings): UsePresets => {
  const [preset, setPreset] = useState<AiServicePreset>();
  const provider = settings.modelProvider ?? 'edge';
  const defaultModel = settings.modelDefaults?.[provider];

  // The Ollama manager is only present in the desktop runtime; it both lists installed models and
  // signals that the bundled sidecar (rather than a user-run server) backs the `ollama` provider.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const ollamaState = useAtomValue(ollamaManager?.state ?? emptyStateAtom);

  // List installed models when the Ollama provider is active so freshly-pulled models appear.
  useEffect(() => {
    if (provider === 'ollama') {
      void ollamaManager?.refresh();
    }
  }, [provider, ollamaManager]);

  // Probe the external LM Studio server only when that provider is selected on desktop.
  const lmStudioProbeUrl =
    provider === 'lmstudio' && ollamaManager ? `${LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT}/v1/models` : undefined;
  const lmStudioReachable = useEndpointReachable(lmStudioProbeUrl);

  const presets = useMemo(() => {
    const base = AiServicePresets.filter((preset) => preset.provider === PRESET_PROVIDER[provider]);

    // Desktop Ollama: list installed models (deduped against curated), not the static suggestions.
    if (provider === 'ollama' && ollamaManager) {
      const installed = new Set(ollamaState.models.map((model) => model.name));
      const curated = base.filter((preset) => installed.has(preset.model.slice(OLLAMA_MODEL_PREFIX.length)));
      const existing = new Set(curated.map((preset) => preset.model));
      const extra = ollamaState.models
        .map(
          (model): AiServicePreset => ({
            id: `ollama-${model.name}`,
            provider: 'ollama',
            model: `ai.ollama.model.${model.name}`,
            label: model.name,
          }),
        )
        .filter((preset) => !existing.has(preset.model));
      return [...curated, ...extra];
    }

    // Desktop LM Studio: only offer the curated presets when the external server responds.
    if (provider === 'lmstudio' && ollamaManager) {
      return lmStudioReachable ? base : [];
    }

    return base;
  }, [provider, ollamaManager, ollamaState, lmStudioReachable]);

  const presetOptions = useMemo(
    () => presets.map(({ id, model, label }) => ({ id, label: label ?? model })),
    [presets],
  );

  // Default to the provider's configured model, else the first available preset.
  useEffect(() => {
    const configured = defaultModel ? presets.find((preset) => preset.model === defaultModel) : undefined;
    setPreset(configured ?? presets[0]);
  }, [presets, defaultModel]);

  const handlePresetChange = useCallback<NonNullable<ChatPresetProps['onPresetChange']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset) {
        setPreset(preset);
      }
    },
    [presets],
  );

  return {
    preset: preset,
    presets: presetOptions,
    onPresetChange: handlePresetChange,
  };
};

/** Reactively reports whether an HTTP endpoint responds; `undefined` url disables the probe. */
const useEndpointReachable = (url: string | undefined): boolean => {
  const [reachable, setReachable] = useState(false);
  useEffect(() => {
    if (!url) {
      setReachable(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    fetch(url, { signal: controller.signal })
      .then((response) => active && setReachable(response.ok))
      .catch(() => active && setReachable(false))
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [url]);
  return reachable;
};
