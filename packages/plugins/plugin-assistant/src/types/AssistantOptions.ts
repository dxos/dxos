//
// Copyright 2024 DXOS.org
//

import type { AiService } from '@dxos/ai';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;

  /**
   * Whether creation is offered for the unfinished types (`Agent`, `Sequence`) — default true, off in
   * the curated set, which must not advertise a type it cannot yet do anything useful with.
   */
  experimentalTypes?: boolean;
}
