//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Model, Provider } from '@dxos/ai';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { Assistant, AssistantCapabilities, AssistantPreset, Ollama } from '#types';

import {
  type AiServicePreset,
  defaultsKeyForProvider,
  pickPreset,
  presetsForProvider,
  providerForModel,
  resolveProvider,
} from '../chat-model/index.ts';
import { AssistantNamespace } from '../namespace.ts';
import { modelIcon } from '../util/model-icon.ts';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<AssistantPreset.ChatPresetProps, 'presets' | 'onPresetChange'>;

/**
 * Resolves the chat model presets: every EDGE model, then the models this device serves (the bundled
 * sidecar's installed models, a reachable LM Studio, or the external server settings name). Each preset
 * carries its own provider, so the model picked decides where inference runs. The selection is the chat's
 * own (`Chat.session.model`), written back to it when the user picks; a chat that has not selected one
 * shows the configured default.
 */
export const usePresets = (settings: Assistant.Settings, chat?: Chat.Chat): UsePresets => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  // Subscribed rather than read: the picker has to follow a selection made on another mount of the
  // same chat, and the stamp the chat model writes before the first request.
  const [session] = useObject(chat, 'session');
  const chatModel = session?.model;

  // The Ollama manager is the bundled sidecar (desktop only); its presence signals that the
  // `built-in` provider (rather than an external Ollama server) is available.
  const ollamaManager = Hooks.useOptionalCapability(AssistantCapabilities.OllamaManager);

  const provider = resolveProvider(settings.modelProvider, !!ollamaManager);
  const defaultModel = settings.modelDefaults?.[defaultsKeyForProvider(provider)];

  // Installed models reported by the bundled sidecar; used to offer only models actually present.
  const localModels = useAtomValue(ollamaManager?.state ?? Ollama.emptyState);

  useEffect(() => {
    if (provider === Provider.builtIn.id && ollamaManager && localModels.kind === 'idle') {
      void EffectEx.runPromise(ollamaManager.refresh);
    }
  }, [provider, ollamaManager, localModels.kind]);

  const lmStudioProbeUrl =
    provider === Provider.lmStudio.id && ollamaManager ? `${Provider.lmStudio.endpoint}/v1/models` : undefined;
  const lmStudioReachable = useEndpointReachable(lmStudioProbeUrl);

  const { presets, fallbackPresets } = useMemo(() => {
    const edge = presetsForProvider(Provider.edge.id);
    if (provider === Provider.edge.id) {
      return { presets: edge, fallbackPresets: edge };
    }
    let local = presetsForProvider(provider);
    if (provider === Provider.lmStudio.id && ollamaManager && !lmStudioReachable) {
      local = [];
    } else if (provider === Provider.builtIn.id && ollamaManager) {
      const installed = new Set(localModels.models.map((model) => model.name));
      local = local.filter((preset) => installed.has(preset.backend));
    }
    const runtime = local.map((preset) => ({ ...preset, local: true }));
    return { presets: [...edge, ...runtime], fallbackPresets: runtime };
  }, [provider, ollamaManager, lmStudioReachable, localModels]);

  // The chat's selection when the active provider serves it, else the provider's configured model.
  // A selection the provider does not serve (the chat picked Claude, then the user went offline) is
  // still what the process will run, so it is shown as an unavailable entry rather than silently
  // displayed as the fallback - the picker and the request must agree.
  const unavailable = useMemo<AiServicePreset | undefined>(() => {
    const unlisted = provider !== Provider.edge.id && fallbackPresets.length === 0;
    if (!chatModel || unlisted || presets.some((preset) => preset.model === chatModel)) {
      return undefined;
    }
    // Carries the provider that actually serves the model rather than the active one, which by
    // definition does not - a resolver chain that still reaches it then can.
    const catalog = Model.byId(chatModel)[0];
    return {
      id: chatModel,
      provider: providerForModel(chatModel, provider) ?? provider,
      model: chatModel,
      backend: catalog?.backend ?? '',
      label: t('model-unavailable.label', { label: catalog?.label ?? DXN.getName(chatModel) }),
    };
  }, [chatModel, presets, fallbackPresets, provider, t]);

  const preset = useMemo(
    () =>
      presets.find((preset) => preset.model === chatModel) ?? unavailable ?? pickPreset(fallbackPresets, defaultModel),
    [presets, fallbackPresets, chatModel, unavailable, defaultModel],
  );

  const presetOptions = useMemo(
    () =>
      [...presets, ...(unavailable ? [unavailable] : [])].map((preset) => ({
        id: preset.id,
        label: preset.label ?? preset.model,
        local: 'local' in preset && preset.local === true,
        icon: modelIcon(preset.model),
      })),
    [presets, unavailable],
  );

  const handlePresetChange = useCallback<NonNullable<AssistantPreset.ChatPresetProps['onPresetChange']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset && chat) {
        Obj.update(chat, (chat) => {
          chat.session = { ...chat.session, model: preset.model };
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
