//
// Copyright 2023 DXOS.org
//

import { AgentHostingProviderClient } from '@dxos/client/services';
import { type Config } from '@dxos/config';

export const useAgentHostingProviderClient = (config: Config): AgentHostingProviderClient => {
  return new AgentHostingProviderClient(config);
};
