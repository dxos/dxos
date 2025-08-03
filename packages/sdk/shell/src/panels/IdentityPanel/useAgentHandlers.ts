//
// Copyright 2024 DXOS.org
//

import { type CancellableInvitation } from '@dxos/client-protocol';
import { useClient } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';

import { type AgentFormProps } from '../../components';

import { useEdgeAgentHandlers } from './useEdgeAgentsHandlers';
import { useKubeAgentHandlers } from './useKubeAgentHandlers';

export const useAgentHandlers = (params: {
  invitations: CancellableInvitation[];
  identity: Identity | null;
}): AgentFormProps => {
  const client = useClient();
  if (client.config.values?.runtime?.client?.edgeFeatures?.agents) {
    return useEdgeAgentHandlers(params);
  } else {
    return useKubeAgentHandlers(params);
  }
};
