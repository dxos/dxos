//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Model, Provider } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Assistant, AssistantCapabilities, AssistantPreset, Ollama } from '#types';

import {
  type AiServicePreset,
  defaultsKeyForProvider,
  pickPreset,
  presetsForProvider,
  providerForModel,
  resolveProvider,
} from '../processor/index.ts';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<AssistantPreset.ChatPresetProps, 'presets' | 'onPresetChange'>;

/**
 * Resolves the chat model presets for the provider selected in settings ({@link Assistant.Settings.modelProvider}).
 * The selection is the chat's own (`Chat.model`), written back to it when the user picks; a chat that
 * has not selected one shows the configured per-provider model.
 */
export const usePresets = (settings: Assistant.Settings, chat?: Chat.Chat): UsePresets => {
  const { t } = useTranslation(meta.profile.key);
  // Subscribed rather than read: the picker has to follow a selection made on another mount of the
  // same chat, and the stamp the processor writes before the first request.
  const [modelRef] = useObject(chat, 'model');
  // The ref carries the model's DXN as its URI; a ref to anything else is not a model selection.
  const chatModel = modelRef ? DXN.tryMake(modelRef.uri) : undefined;

  // The Ollama manager is the bundled sidecar (desktop only); its presence signals that the
  // `built-in` provider (rather than an external Ollama server) is available.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);

  const provider = resolveProvider(settings.modelProvider, !!ollamaManager);
  const defaultModel = settings.modelDefaults?.[defaultsKeyForProvider(provider)];

  // Installed models reported by the bundled sidecar; used to offer only models actually present.
  const localModels = useAtomValue(ollamaManager?.state ?? Ollama.emptyState);

  // When the bundled sidecar is the active provider, list installed models in the background so the
  // chat selector is populated without first opening settings. Idempotent: kicks off only from the
  // idle state, so it spawns the sidecar once when local models are in use (not on every launch);
  // settings remains the explicit path for retrying after a failure.
  useEffect(() => {
    if (provider === Provider.builtIn.id && ollamaManager && localModels.kind === 'idle') {
      void EffectEx.runPromise(ollamaManager.refresh);
    }
  }, [provider, ollamaManager, localModels.kind]);

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

  // The chat's selection when the active provider serves it, else the provider's configured model.
  // A selection the provider does not serve (the chat picked Claude, then the user went offline) is
  // still what the process will run, so it is shown as an unavailable entry rather than silently
  // displayed as the fallback — the picker and the request must agree.
  const unavailable = useMemo<AiServicePreset | undefined>(() => {
    if (!chatModel || presets.length === 0 || presets.some((preset) => preset.model === chatModel)) {
      return undefined;
    }
    // Carries the provider that actually serves the model rather than the active one, which by
    // definition does not — a resolver chain that still reaches it then can.
    const catalog = Model.byId(chatModel)[0];
    return {
      id: chatModel,
      provider: providerForModel(chatModel, provider) ?? provider,
      model: chatModel,
      backend: catalog?.backend ?? '',
      label: t('model-unavailable.label', { label: catalog?.label ?? DXN.getName(chatModel) }),
    };
  }, [chatModel, presets, provider, t]);

  const preset = useMemo(
    () => presets.find((preset) => preset.model === chatModel) ?? unavailable ?? pickPreset(presets, defaultModel),
    [presets, chatModel, unavailable, defaultModel],
  );

  const presetOptions = useMemo(
    () =>
      [...presets, ...(unavailable ? [unavailable] : [])].map(({ id, model, label }) => ({
        id,
        label: label ?? model,
      })),
    [presets, unavailable],
  );

  const handlePresetChange = useCallback<NonNullable<AssistantPreset.ChatPresetProps['onPresetChange']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset && chat) {
        Obj.update(chat, (chat) => {
          chat.model = Ref.fromURI(preset.model);
        });
      }
    },
    [presets, chat],
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
