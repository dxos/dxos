//
// Copyright 2023 DXOS.org
//

import { type Halo } from '@dxos/client/halo';
import {
  type AgentHostingProviderClient,
  DXOSAgentHostingProviderClient,
  FakeAgentHostingProvider,
} from '@dxos/client/services';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

/*
 * Interface for invoking the agent hosting provider client.
 * @experimental
 */
export const useAgentHostingProviderClient = (config: Config, halo: Halo): AgentHostingProviderClient | null => {
  const agentHostingConfig = config.get('runtime.services.agentHosting');
  if (!agentHostingConfig) {
    log.info('no agent hosting configured');
    return null;
  }
  // TODO: Dynamically discover based on runtime config
  let agentHostingProviderClient: AgentHostingProviderClient | null = null;

  switch (agentHostingConfig.type) {
    case 'LOCAL_TESTING':
      log.info('using FakeAgentHostingProvider');
      return new FakeAgentHostingProvider(config, halo);

    case 'AGENTHOSTING_API':
      if (localStorage.getItem('dxos.org/shell/features/agentHosting') !== 'true') {
        log.info('dxos.org/shell/features/agentHosting not enabled');
        return null;
      }
      agentHostingProviderClient = new DXOSAgentHostingProviderClient(config, halo);
      if (agentHostingProviderClient.init()) {
        return agentHostingProviderClient;
      } else {
        // Not authorized or error initializing
        return null;
      }
    default:
      log.error('Unknown agent hosting provider type: ' + agentHostingConfig.type);
      return null;
  }
};
