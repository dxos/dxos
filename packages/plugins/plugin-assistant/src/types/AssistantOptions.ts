//
// Copyright 2024 DXOS.org
//

import type { MakeTurnProducer } from '@dxos/agent-runtime';
import type { AiService } from '@dxos/ai';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;

  /**
   * Whether creation is offered for the unfinished types (`Agent`, `Sequence`) — default true, off in
   * the curated set, which must not advertise a type it cannot yet do anything useful with.
   */
  experimentalTypes?: boolean;

  /**
   * Builds the turn engine used when the user enables `Settings.codeMode`; injected by the host
   * because the code-mode package is not published. Handed the app's capabilities so the host can
   * reach what its sandbox needs (e.g. the client's services). Without it the setting has no effect.
   */
  codeModeTurnProducer?: (capabilities: CapabilityManager.CapabilityManager) => MakeTurnProducer;
}
