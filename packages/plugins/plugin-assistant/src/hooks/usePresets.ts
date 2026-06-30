//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Provider } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';

import { type Assistant, AssistantCapabilities, type ChatPresetProps, Ollama } from '#types';

import { type AiServicePreset, defaultsKeyForProvider, presetsForProvider, resolveProvider } from '../processor';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<ChatPresetProps, 'presets' | 'onPresetChange'>;

/**
 * Resolves the chat model presets for the provider selected in settings ({@link Assistant.Settings.modelProvider}),
 * defaulting the selection to the configured per-provider model.
 */
export const usePresets = (settings: Assistant.Settings): UsePresets => {
  const [preset, setPreset] = useState<AiServicePreset>();

  // The Ollama manager is the bundled sidecar (desktop only); its presence signals that the
  // `built-in` provider (rather than an external Ollama server) is available.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);

  const provider = resolveProvider(settings.modelProvider, !!ollamaManager);
  const defaultModel = settings.modelDefaults?.[defaultsKeyForProvider(provider)];

  // Installed models reported by the bundled sidecar; used to offer only models actually present.
  const localModels = useAtomValue(ollamaManager?.state ?? Ollama.emptyState);

  // Probe the external LM Studio server only when that provider is selected on desktop.
  const lmStudioProbeUrl =
    provider === Provider.lmStudio.id && ollamaManager ? `${Provider.lmStudio.endpoint}/v1/models` : undefined;
  const lmStudioReachable = useEndpointReachable(lmStudioProbeUrl);

  const presets = useMemo(() => {
    const base = presetsForProvider(provider);
    // Desktop LM Studio: only offer presets when the external server responds.
    if (provider === Provider.lmStudio.id && ollamaManager) {
      return lmStudioReachable ? base : [];
    }
    // Bundled sidecar: only offer models that are actually installed (matched by back-end pull tag).
    if (provider === Provider.builtIn.id && ollamaManager) {
      const installed = new Set(localModels.models.map((model) => model.name));
      return base.filter((preset) => installed.has(preset.backend));
    }
    return base;
  }, [provider, ollamaManager, lmStudioReachable, localModels]);

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
