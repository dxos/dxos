//
// Copyright 2024 DXOS.org
//

import type { AiService } from '@dxos/ai';

// TODO(wittjosiah): Remove. This is included in Assistant namespace.
// Re-export Chat type from assistant-toolkit for public API type declarations.
export type { Chat as ChatType } from '@dxos/assistant-toolkit';

export * as Assistant from './Assistant';
export * as AssistantOperation from './AssistantOperation';
export * as AssistantCapabilities from './AssistantCapabilities';
export * as AssistantEvents from './AssistantEvents';

// TODO(wittjosiah): Namespace.
export * from './preset';
export * from './service';

export interface AssistantPluginOptions {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;
}
