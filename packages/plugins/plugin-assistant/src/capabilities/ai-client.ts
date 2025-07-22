//
// Copyright 2025 DXOS.org
//

import { effect, signal } from '@preact/signals-core';

import { type AiServiceClient, EdgeAiServiceClient, OllamaAiServiceClient } from '@dxos/ai';
import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantCapabilities } from './capabilities';
import { meta } from '../meta';
import { type Assistant } from '../types';

// TODO(wittjosiah): Factor out.
const DEFAULT_AI_SERVICE_URL = 'http://localhost:8788';

export default (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const endpoint = client.config.values.runtime?.services?.ai?.server ?? DEFAULT_AI_SERVICE_URL;
  const aiClient = signal<AiServiceClient>(new EdgeAiServiceClient({ endpoint }));

  const unsubscribe = effect(() => {
    const settings = context.getCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
    if (settings?.llmProvider === 'ollama') {
      aiClient.value = new OllamaAiServiceClient();
    } else {
      aiClient.value = new EdgeAiServiceClient({
        endpoint,
        defaultGenerationOptions: {
          // model: '@anthropic/claude-sonnet-4-20250514',
          model: '@anthropic/claude-3-5-haiku-20241022',
        },
      });
    }
  });

  return contributes(AssistantCapabilities.AiClient, aiClient, () => unsubscribe());
};
