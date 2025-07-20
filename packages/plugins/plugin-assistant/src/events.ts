//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AssistantEvents {
  export const AiClientReady = Events.createStateEvent(`${meta.id}/ai-client-ready`);
}
