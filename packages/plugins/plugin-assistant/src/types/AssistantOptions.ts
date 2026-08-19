//
// Copyright 2024 DXOS.org
//

import type { AiService } from '@dxos/ai';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;

  /**
   * Whether the still-unfinished types (`Agent`, `Sequence`) are registered and offered for
   * creation. Defaults to true; the curated set (`plugin-defs.production.tsx`) turns it off, so
   * `composer.space` neither advertises nor opens a type it cannot yet do anything useful with.
   */
  experimentalTypes?: boolean;
}
