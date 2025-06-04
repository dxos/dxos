//
// Copyright 2025 DXOS.org
//

import { type AIServiceClient, AIServiceEdgeClient, OllamaClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { isNode } from '@dxos/util';

import { ChromePromptClient } from './chrome-prompt-client';

export const getExecutor = (type: 'remote' | 'local' = 'remote'): FunctionExecutor => {
  let client: AIServiceClient;
  switch (type) {
    case 'remote':
      client = new AIServiceEdgeClient({
        endpoint: AI_SERVICE_ENDPOINT.REMOTE,
        defaultGenerationOptions: {
          model: '@anthropic/claude-3-5-sonnet-20241022',
        },
      });
      break;
    case 'local':
      if (isNode()) {
        client = new OllamaClient({
          overrides: {
            model: 'llama3.1:8b',
          },
        });
      } else {
        client = new ChromePromptClient();
      }
      break;
    default:
      throw new Error(`Invalid executor type: ${type}`);
  }

  return new FunctionExecutor(
    new ServiceContainer().setServices({
      ai: { client },
    }),
  );
};
