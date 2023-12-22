//
// Copyright 2023 DXOS.org
//

import { AgentHostingProviderClient } from '@dxos/client/services';

export const useAgentHostingProviderClient = (): AgentHostingProviderClient => {
  return new AgentHostingProviderClient();
};
