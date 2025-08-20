//
// Copyright 2024 DXOS.org
//

import { DEFAULT_EDGE_MODEL } from '@dxos/ai';
import { createSystemPrompt } from '@dxos/assistant';

import { type AiChatProcessorOptions } from '../hooks';

/**
 * @deprecated
 */
export const createProcessorOptions = (): Pick<AiChatProcessorOptions, 'model' | 'system'> => ({
  model: DEFAULT_EDGE_MODEL,
  system: createSystemPrompt({}),
});
