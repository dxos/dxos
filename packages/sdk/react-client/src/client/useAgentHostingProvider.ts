//
// Copyright 2023 DXOS.org
//

import { AgentHostingProviderClient } from '@dxos/client/services';

import { useClient } from './ClientContext';

import { ClientContext } from './ClientContext';

export const useAgentHostingProviderClient = (): AgentHostingProviderClient => {
  return new AgentHostingProviderClient();
};
