//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { LMStudioResolver } from '@dxos/ai/resolvers';
import { useOptionalCapability } from '@dxos/app-framework/ui';

import { AssistantCapabilities, type ChatPresetProps, type Ollama } from '#types';

import { type AiServicePreset, AiServicePresets } from '../processor';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<ChatPresetProps, 'presets' | 'onPresetChange'>;

/** Prefix shared by all Ollama model ids; the suffix is the installed model name. */
const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

// Stable fallback so `useAtomValue` is always called with a valid atom when the (desktop-only)
// Ollama manager capability is absent.
const EMPTY_OLLAMA_STATE: Ollama.ModelsState = { kind: 'idle', models: [], pulls: {} };
const emptyStateAtom = Atom.make(EMPTY_OLLAMA_STATE);

export const usePresets = (online: boolean): UsePresets => {
  // TODO(burdon): Memo preset for provider.
  const [preset, setPreset] = useState<AiServicePreset>();
  // The Ollama manager is only present in the desktop runtime; absent elsewhere (browser/mobile),
  // the curated presets are offered unchanged. Subscribe via `useAtomValue` so the picker
  // re-renders as models are pulled or removed.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const ollamaState = useAtomValue(ollamaManager?.state ?? emptyStateAtom);

  // Entering local mode lists installed models (and spawns the sidecar) so freshly-pulled models
  // appear in the picker even when settings was never opened.
  useEffect(() => {
    if (!online) {
      void ollamaManager?.refresh();
    }
  }, [online, ollamaManager]);

  // Probe the external LM Studio server (desktop local mode only); its presets gate on reachability.
  const lmStudioProbeUrl =
    !online && ollamaManager ? `${LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT}/v1/models` : undefined;
  const lmStudioReachable = useEndpointReachable(lmStudioProbeUrl);

  const presets = useMemo(() => {
    const base = AiServicePresets.filter((preset) => online === (preset.provider === 'dxos-remote'));
    // Remote, or no desktop manager (browser/mobile): offer the curated presets unchanged.
    if (online || !ollamaManager) {
      return base;
    }

    // Desktop local mode: show a curated preset only if its backend is reachable — Ollama-routed
    // models when installed, LM Studio presets when the server responds.
    const installed = new Set(ollamaState.models.map((model) => model.name));
    const available = base.filter((preset) =>
      preset.model.startsWith(OLLAMA_MODEL_PREFIX)
        ? installed.has(preset.model.slice(OLLAMA_MODEL_PREFIX.length))
        : preset.provider === 'lm-studio'
          ? lmStudioReachable
          : true,
    );

    // Append installed Ollama models that are not already curated.
    const existing = new Set(available.map((preset) => preset.model));
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
    return [...available, ...extra];
  }, [online, ollamaManager, ollamaState, lmStudioReachable]);

  const presetOptions = useMemo(() => presets.map(({ id, model, label }) => ({ id, label: label ?? model })), [presets]);

  useEffect(() => {
    setPreset(presets[0]);
  }, [presets]);

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
