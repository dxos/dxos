//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DEFAULT_EDGE_MODELS, type LLMModel } from '@dxos/ai';

const ModelProviders = ['dxos-local', 'dxos-remote', 'lm-studio'] as const;

const ModelProvider = Schema.Literal(...ModelProviders);
type ModelProvider = Schema.Schema.Type<typeof ModelProvider>;

export type AiServicePreset = {
  id: string;
  model: LLMModel;
  provider: ModelProvider;
  label?: string;
};

const createModelLabel = (model: LLMModel) => {
  const parts = model.split('/');
  return parts[parts.length - 1];
};

// TODO(burdon): Users should be able to create and edit presets.
export const AiServicePresets: AiServicePreset[] = [
  {
    model: DEFAULT_EDGE_MODELS[0],
    provider: 'dxos-remote' as const,
  },
  {
    model: '@google/gemma-3-12b' as const,
    provider: 'lm-studio' as const,
  },
  {
    model: 'deepseek/deepseek-r1-0528-qwen3-8b' as const,
    provider: 'lm-studio' as const,
  },
  {
    model: 'llama-3.2-3b-instruct' as const,
    provider: 'lm-studio' as const,
  },
].map(
  ({ model, provider }, i) =>
    ({
      id: `preset-${i}`,
      model,
      provider,
      label: createModelLabel(model),
    }) satisfies AiServicePreset,
);
