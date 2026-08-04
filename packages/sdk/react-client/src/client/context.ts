//
// Copyright 2020 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { type AgentHostingProviderClient, type Client, type SystemStatus } from '@dxos/client';

export type ClientContextProps = {
  client: Client;
  status?: SystemStatus | null;
};

/**
 * @internal Use ClientProvider to create or initialize the Client.
 */
export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined,
);

// Kept out of `AgentHostingProvider.tsx`: react-refresh only fast-refreshes a module whose exports
// are all components, so a context and hook exported beside the provider make it a reload boundary
// for everything downstream of it.
export const AgentHostingContext = createContext<AgentHostingProviderClient | null>(null);

export const useAgentHostingClient = () => {
  return useContext(AgentHostingContext);
};
