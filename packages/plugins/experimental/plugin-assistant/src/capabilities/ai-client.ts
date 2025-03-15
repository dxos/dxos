//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantCapabilities } from './capabilities';

// TODO(wittjosiah): Factor out.
const DEFAULT_AI_SERVICE_URL = 'http://localhost:8788';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);
  const endpoint = client.config.values.runtime?.services?.ai?.server ?? DEFAULT_AI_SERVICE_URL;
  const aiClient = new AIServiceEdgeClient({ endpoint });
  return contributes(AssistantCapabilities.AiClient, aiClient);
};
