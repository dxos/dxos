//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ModelName } from '@dxos/ai';

const ModelProviders = ['dxos-local', 'dxos-remote', 'lm-studio', 'ollama'] as const;

const ModelProvider = Schema.Literal(...ModelProviders);
type ModelProvider = Schema.Schema.Type<typeof ModelProvider>;

export type AiServicePreset = {
  id: string;
  provider: ModelProvider;
  model: ModelName;
  label?: string;
};

const createModelLabel = (model: ModelName) => {
  const parts = model.split('.');
  return parts[parts.length - 1];
};

// TODO(burdon): Users should be able to create and edit presets.
export const AiServicePresets: AiServicePreset[] = [
  // Sonnet is first so it is the default selection.
  {
    provider: 'dxos-remote' as const,
    model: 'ai.claude.model.claude-sonnet-4-6' as const,
    label: 'Claude Sonnet',
  },
  {
    provider: 'dxos-remote' as const,
    model: 'ai.claude.model.claude-opus-4-8' as const,
    label: 'Claude Opus',
  },
  {
    provider: 'dxos-remote' as const,
    model: 'ai.claude.model.claude-haiku-4-5' as const,
    label: 'Claude Haiku',
  },
  {
    provider: 'ollama' as const,
    model: 'ai.ollama.model.gpt-oss:20b' as const,
  },
  {
    provider: 'ollama' as const,
    model: 'ai.ollama.model.gemma4:latest' as const,
  },
  {
    provider: 'lm-studio' as const,
    model: 'ai.google.model.gemma-3-27b' as const,
  },
  {
    provider: 'lm-studio' as const,
    model: 'ai.meta.model.llama-3.2-3b-instruct' as const,
  },
  {
    model: 'ai.ollama.model.deepseek-r1:latest' as const,
    provider: 'dxos-local' as const,
  },
].map(
  ({ model, provider, label }, i) =>
    ({
      id: `preset-${i}`,
      provider,
      model,
      label: label ?? createModelLabel(model),
    }) satisfies AiServicePreset,
);
