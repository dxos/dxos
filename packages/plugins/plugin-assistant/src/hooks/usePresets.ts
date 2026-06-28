//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OLLAMA_MODEL_PREFIX, type OllamaModelId, PROVIDERS, getModel } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';

import { type Assistant, AssistantCapabilities, type ChatPresetProps, type Ollama } from '#types';

import { type AiServicePreset, presetsForProvider, resolveProvider } from '../processor';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<ChatPresetProps, 'presets' | 'onPresetChange'>;

// Stable fallback so `useAtomValue` is always called with a valid atom when the (desktop-only)
// Ollama manager capability is absent.
const EMPTY_OLLAMA_STATE: Ollama.ModelsState = { kind: 'idle', models: [], loaded: [], pulls: {}, errors: {} };
const emptyStateAtom = Atom.make(EMPTY_OLLAMA_STATE);

/**
 * Resolves the chat model presets for the provider selected in settings ({@link Assistant.Settings.modelProvider}),
 * defaulting the selection to the configured per-provider model.
 */
export const usePresets = (settings: Assistant.Settings): UsePresets => {
  const [preset, setPreset] = useState<AiServicePreset>();

  // The Ollama manager is the bundled sidecar (desktop only); it lists installed models and signals
  // that the `built-in` provider (rather than an external Ollama server) is available.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const ollamaState = useAtomValue(ollamaManager?.state ?? emptyStateAtom);

  const provider = resolveProvider(settings.modelProvider, !!ollamaManager);
  const defaultModel = settings.modelDefaults?.[provider];

  // Refresh the sidecar's installed models when the built-in provider is active so fresh pulls appear.
  useEffect(() => {
    if (provider === 'built-in') {
      void ollamaManager?.refresh();
    }
  }, [provider, ollamaManager]);

  // Probe the external LM Studio server only when that provider is selected on desktop.
  const lmStudioProbeUrl =
    provider === 'lmstudio' && ollamaManager ? `${PROVIDERS.lmstudio.endpoint}/v1/models` : undefined;
  const lmStudioReachable = useEndpointReachable(lmStudioProbeUrl);

  const presets = useMemo(() => {
    const base = presetsForProvider(provider);

    // Built-in sidecar: list the installed models (catalog labels where known) rather than the
    // curated suggestions.
    if (provider === 'built-in') {
      return ollamaState.models.map((model): AiServicePreset => {
        const id: OllamaModelId = `${OLLAMA_MODEL_PREFIX}${model.name}`;
        return { id, provider, model: id, label: getModel(id)?.label ?? model.name };
      });
    }

    // Desktop LM Studio: only offer the curated presets when the external server responds.
    if (provider === 'lmstudio' && ollamaManager) {
      return lmStudioReachable ? base : [];
    }

    return base;
  }, [provider, ollamaManager, ollamaState, lmStudioReachable]);

  const presetOptions = useMemo(() => presets.map(({ id, model, label }) => ({ id, label: label ?? model })), [presets]);

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
    preset,
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
