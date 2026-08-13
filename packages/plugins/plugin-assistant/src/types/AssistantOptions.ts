//
// Copyright 2024 DXOS.org
//

import type { AiService } from '@dxos/ai';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;
}
