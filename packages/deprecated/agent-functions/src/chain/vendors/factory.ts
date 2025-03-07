//
// Copyright 2023 DXOS.org
//

import { createOllamaChainResources, type OllamaChainResourcesOptions } from './ollama';
import { createOpenAIChainResources, type OpenAIChainResourcesOptions } from './openai';
import { type ChainResources } from '../resources';

export type ChainVariant = 'openai' | 'ollama';

export const createChainResources = (
  variant: ChainVariant,
  options: OpenAIChainResourcesOptions | OllamaChainResourcesOptions = {},
): ChainResources => {
  switch (variant) {
    case 'openai':
      return createOpenAIChainResources(options);
    case 'ollama':
      return createOllamaChainResources(options);
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
};
