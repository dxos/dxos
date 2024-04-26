//
// Copyright 2023 DXOS.org
//

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
export const useAgentHostingProviderClient = (config: Config): AgentHostingProviderClient | null => {
  // TODO: Dynamically discover based on runtime config
  if (
    config.get('runtime.app.env.DX_ENVIRONMENT') !== 'development' &&
    localStorage.getItem('dxos.org/shell/features/agentHosting') !== 'true'
  ) {
    return null;
  }

  const agentHostingConfig = config.get('runtime.services.agentHosting');
  if (!agentHostingConfig) {
    log.info('no agent hosting configured');
    return null;
  }

  if (agentHostingConfig.type === 'LOCAL_TESTING') {
    return new FakeAgentHostingProvider(config);
  }

  return new DXOSAgentHostingProviderClient(config);
};
