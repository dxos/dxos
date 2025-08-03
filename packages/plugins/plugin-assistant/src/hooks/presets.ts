//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type LLMModel } from '@dxos/ai';

const ModelProviders = ['dxos-local', 'dxos-remote', 'lm-studio'] as const;

const ModelProvider = Schema.Literal(...ModelProviders);
type ModelProvider = Schema.Schema.Type<typeof ModelProvider>;

export type AiServicePreset = {
  id: string;
  provider: ModelProvider;
  model: LLMModel;
  label?: string;
};

const createModelLabel = (model: LLMModel) => {
  const parts = model.split('/');
  return parts[parts.length - 1];
};

// TODO(burdon): Users should be able to create and edit presets.
export const AiServicePresets: AiServicePreset[] = [
  {
    provider: 'dxos-remote' as const,
    model: '@anthropic/claude-3-5-haiku-20241022' as const,
  },
  {
    provider: 'dxos-remote' as const,
    model: '@anthropic/claude-opus-4-0' as const,
  },
  {
    provider: 'lm-studio' as const,
    model: '@google/gemma-3-12b' as const,
  },
  {
    provider: 'lm-studio' as const,
    model: '@mlx-community/llama-3.2-3b-instruct' as const,
  },
  { model: 'deepseek-r1:latest' as const, provider: 'dxos-local' as const} ,
].map(
  ({ model, provider }, i) =>
    ({
      id: `preset-${i}`,
      provider,
      model,
      label: createModelLabel(model),
    }) satisfies AiServicePreset,
);
