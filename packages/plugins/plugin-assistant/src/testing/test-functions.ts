//
// Copyright 2024 DXOS.org
//

import { DEFAULT_EDGE_MODEL, type GenerateRequest } from '@dxos/ai';
import { createSystemPrompt } from '@dxos/assistant';

/**
 * @deprecated
 */
export const createProcessorOptions = (blueprints: string[]): Pick<GenerateRequest, 'model' | 'systemPrompt'> => ({
  model: DEFAULT_EDGE_MODEL,
  systemPrompt: createSystemPrompt({ blueprints }),
});
