//
// Copyright 2025 DXOS.org
//

import { Events, defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AssistantEvents {
  export const AiClientReady = Events.createStateEvent(`${meta.id}/ai-client-ready`);

  export const AiServiceProvidersReady = defineEvent(`${meta.id}/event/ai-service-providers-ready`);
}
