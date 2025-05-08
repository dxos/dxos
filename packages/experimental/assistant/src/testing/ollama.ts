//
// Copyright 2025 DXOS.org
//

import { DEFAULT_OLLAMA_MODEL, OllamaClient, type OllamaClientParams } from '../ai-service';

/**
 * Create a test client with small local model and no temperature for predictable results.
 */
export const createTestOllamaClient = (options?: Pick<OllamaClientParams, 'tools'>) => {
  return new OllamaClient({
    tools: options?.tools,
    overrides: { model: DEFAULT_OLLAMA_MODEL, temperature: 0 },
  });
};
