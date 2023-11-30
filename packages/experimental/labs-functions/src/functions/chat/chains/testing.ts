//
// Copyright 2023 DXOS.org
//

import { type ChainResources, type ChainResourcesOptions } from '../../../chain';
import { createOpenAIChainResources, createOllamaChainResources } from '../../../chain';
import { getConfig, getKey } from '../../../util';

export const getResources = (
  type = process.env.DX_AI_MODEL ?? 'ollama',
  options: Partial<ChainResourcesOptions<any, any>> = {
    baseDir: '/tmp/dxos/testing/agent/functions/chat',
  },
): ChainResources => {
  const config = getConfig()!;

  switch (type) {
    case 'ollama':
      return createOllamaChainResources({
        chat: {
          temperature: 0,
          model: 'llama2',
        },
        ...options,
      });

    case 'openai':
      return createOpenAIChainResources({
        apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
        chat: {
          temperature: 0,
          modelName: 'gpt-3.5-turbo-1106',
        },
        ...options,
      });

    default:
      throw new Error(`Invalid type: ${type}`);
  }
};
