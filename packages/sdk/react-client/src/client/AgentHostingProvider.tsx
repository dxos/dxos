//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';

import { type AgentHostingProviderClient, AgentManagerClient, FakeAgentHostingProvider } from '@dxos/client';
import { type Halo } from '@dxos/client/halo';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

// Imported from the defining module, not the directory barrel: `'../client'` is this file's own
// barrel, and that cycle made every downstream edit a full page reload.
import { AgentHostingContext } from './context.ts';
import { useClient } from './useClient.ts';

export type AgentHostingProviderProps = { config: Config; halo: Halo };

/**
 * Experimental agent hosting provider.
 * @param props
 * @constructor
 * @deprecated
 */
export const AgentHostingProvider = (props: PropsWithChildren) => {
  const client = useClient();
  const [agentHostingProviderClient] = useState(makeClient(client));
  return (
    <AgentHostingContext.Provider value={agentHostingProviderClient}> {props.children}</AgentHostingContext.Provider>
  );
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
    case 'LOCAL_TESTING': {
      log('using FakeAgentHostingProvider');
      return new FakeAgentHostingProvider();
    }

    case 'AGENTHOSTING_API': {
      agentHostingProviderClient = new AgentManagerClient(config, halo);
      if (agentHostingProviderClient.init()) {
        return agentHostingProviderClient;
      } else {
        // Not authorized or error initializing.
        return null;
      }
    }

    default: {
      log.error('Unknown agent hosting provider type: ' + agentHostingConfig.type);
      return null;
    }
  }
};
