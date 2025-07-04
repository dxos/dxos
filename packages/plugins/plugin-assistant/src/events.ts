//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { ASSISTANT_PLUGIN } from './meta';

export namespace AssistantEvents {
  export const AiClientReady = Events.createStateEvent(`${ASSISTANT_PLUGIN}/ai-client-ready`);
}
