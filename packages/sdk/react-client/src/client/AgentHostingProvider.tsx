//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useState } from 'react';

import { type Halo } from '@dxos/client/halo';
import { type AgentHostingProviderClient, AgentManagerClient, FakeAgentHostingProvider } from '@dxos/client/services';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { useClient } from './ClientContext';

/*
 * Interface for invoking the agent hosting provider client.
 * @experimental
 */

export type AgentHostingProviderProps = { config: Config; halo: Halo };

export const AgentHostingContext = createContext<AgentHostingProviderClient | null>(null);

export const AgentHostingProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const [agentHostingProviderClient] = useState(makeClient(client));
  return (
    <AgentHostingContext.Provider value={agentHostingProviderClient}> {props.children}</AgentHostingContext.Provider>
  );
};

export const useAgentHostingClient = () => {
  return useContext(AgentHostingContext);
};

const makeClient = ({ config, halo }: AgentHostingProviderProps) => {
  const agentHostingConfig = config.get('runtime.services.agentHosting');
  if (!agentHostingConfig) {
    log('no agent hosting configured');
    return null;
  }

  // TODO(nf): Dynamically discover based on runtime config.
  let agentHostingProviderClient: AgentHostingProviderClient | null = null;
  switch (agentHostingConfig.type) {
    case 'LOCAL_TESTING':
      log.info('using FakeAgentHostingProvider');
      return new FakeAgentHostingProvider(config, halo);

    case 'AGENTHOSTING_API':
      agentHostingProviderClient = new AgentManagerClient(config, halo);
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
