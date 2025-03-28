//
// Copyright 2024 DXOS.org
//

import { createSystemPrompt } from '@dxos/artifact';
import { DEFAULT_EDGE_MODEL, type GenerateRequest } from '@dxos/assistant';

export const createProcessorOptions = (artifacts: string[]): Pick<GenerateRequest, 'model' | 'systemPrompt'> => ({
  model: DEFAULT_EDGE_MODEL,
  systemPrompt: createSystemPrompt({ artifacts }),
});
