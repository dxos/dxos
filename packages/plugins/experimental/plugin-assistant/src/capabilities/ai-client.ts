//
// Copyright 2025 DXOS.org
//

import { effect, signal } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type AIServiceClient, AIServiceEdgeClient, OllamaClient } from '@dxos/assistant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantCapabilities } from './capabilities';
import { ASSISTANT_PLUGIN } from '../meta';
import { type AssistantSettingsProps } from '../types';

// TODO(wittjosiah): Factor out.
const DEFAULT_AI_SERVICE_URL = 'http://localhost:8788';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);
  const endpoint = client.config.values.runtime?.services?.ai?.server ?? DEFAULT_AI_SERVICE_URL;

  const ai = signal<AIServiceClient>(new AIServiceEdgeClient({ endpoint }));

  const unsubscribe = effect(() => {
    const settings = context
      .requestCapability(Capabilities.SettingsStore)
      .getStore<AssistantSettingsProps>(ASSISTANT_PLUGIN)!.value;

    if (settings.llmProvider === 'ollama') {
      ai.value = new OllamaClient();
    } else {
      ai.value = new AIServiceEdgeClient({ endpoint });
    }
  });

  return contributes(AssistantCapabilities.AiClient, ai, () => unsubscribe());
};
