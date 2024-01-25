//
// Copyright 2023 DXOS.org
//

import {
  type AgentHostingProviderClient,
  EldonAgentHostingProviderClient,
  FakeAgentHostingProvider,
} from '@dxos/client/services';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

export const useAgentHostingProviderClient = (config: Config): AgentHostingProviderClient | null => {
  // TODO: Dynamically discover

  const agentHostingConfig = config.get('runtime.services.agentHosting');
  if (!agentHostingConfig) {
    log.info('no agent hosting configured');
    return null;
  }

  if (agentHostingConfig.type === 'LOCAL_TESTING') {
    return new FakeAgentHostingProvider(config);
  }

  return new EldonAgentHostingProviderClient(config);
};
