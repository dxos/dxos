//
// Copyright 2024 DXOS.org
//

import type { AiService } from '@dxos/ai';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;

  /**
   * Whether object creation is offered for the types that are still unfinished (`Agent`,
   * `Sequence`). Defaults to true; the curated set (`plugin-defs.production.tsx`) turns it off, so
   * `composer.space` does not advertise a type it cannot yet do anything useful with.
   */
  experimentalTypes?: boolean;
}
