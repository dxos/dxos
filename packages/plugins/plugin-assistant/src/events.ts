//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AssistantEvents {
  export const SetupAiServiceProviders = defineEvent(`${meta.id}/event/setup-ai-service-providers`);
}
