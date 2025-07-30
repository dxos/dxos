//
// Copyright 2025 DXOS.org
//

import { DEFAULT_OLLAMA_MODEL } from '../defs';
import { OllamaAiServiceClient, type OllamaClientParams } from '../deprecated/service';

/**
 * Create a test client with small local model and no temperature for predictable results.
 */
export const createTestAiServiceClient = (options?: Pick<OllamaClientParams, 'tools'>): OllamaAiServiceClient => {
  return new OllamaAiServiceClient({
    tools: options?.tools,
    overrides: {
      model: DEFAULT_OLLAMA_MODEL,
      temperature: 0,
    },
  });
};
