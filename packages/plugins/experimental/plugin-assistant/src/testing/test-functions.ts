//
// Copyright 2024 DXOS.org
//

import { createSystemPrompt } from '@dxos/artifact';
import { DEFAULT_LLM_MODEL, type GenerateRequest } from '@dxos/assistant';

export const createProcessorOptions = (artifacts: string[]): Pick<GenerateRequest, 'model' | 'systemPrompt'> => ({
  model: DEFAULT_LLM_MODEL,
  systemPrompt: createSystemPrompt({ artifacts }),
});
