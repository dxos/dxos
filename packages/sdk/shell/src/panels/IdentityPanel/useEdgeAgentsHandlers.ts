//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type CancellableInvitation } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { QueryAgentStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';

import { type AgentFormProps } from '../../components';

export const useEdgeAgentHandlers = ({
  identity,
}: {
  invitations: CancellableInvitation[];
  identity: Identity | null;
}): AgentFormProps => {
  const [validationMessage, setValidationMessage] = useState('');
  const [lastReceivedStatus, setLastReceivedStatus] = useState<QueryAgentStatusResponse.AgentStatus>(
    QueryAgentStatusResponse.AgentStatus.UNKNOWN,
  );
  const [agentStatus, setAgentStatus] = useState<AgentFormProps['agentStatus']>('getting');
  const client = useClient();
  // TODO(wittjosiah): This should be based on HALO credentials.
  const agentHostingEnabled = Boolean(client.config.values.runtime?.client?.edgeFeatures?.agents);

  const handleStatus = (status: QueryAgentStatusResponse.AgentStatus) => {
    switch (status) {
      case QueryAgentStatusResponse.AgentStatus.ACTIVE:
      case QueryAgentStatusResponse.AgentStatus.INACTIVE:
        setAgentStatus('created');
        break;
      case QueryAgentStatusResponse.AgentStatus.NOT_FOUND:
        setAgentStatus('creatable');
        break;
      case QueryAgentStatusResponse.AgentStatus.UNKNOWN:
        setAgentStatus('getting');
        break;
    }
  };

  useEffect(() => {
    const stream = client.services.services.EdgeAgentService?.queryAgentStatus();
    stream?.subscribe(({ status }) => {
      setLastReceivedStatus(status);
      handleStatus(status);
    });
    return () => {
      void stream?.close().catch(() => {});
    };
  }, []);

  const onAgentCreate = async () => {
    invariant(identity, 'Identity not found');
    const service = client.services.services.EdgeAgentService;
    if (!service) {
      setAgentStatus('error');
      setValidationMessage('Agent service not initialized.');
      return;
    }
    if (!agentHostingEnabled) {
      setAgentStatus('error');
      setValidationMessage('Edge agents are disabled in config.');
      return;
    }
    setAgentStatus('creating');
    setValidationMessage('');
    try {
      await service.createAgent();
      await Promise.all(
        client.spaces
          .get()
          .map((space) => space?.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)),
      );
      setAgentStatus('created');
    } catch (err: any) {
      setAgentStatus('error');
      setValidationMessage(`Error creating an agent: ${err.message}`);
    }
  };

  const onAgentDestroy = async () => {
    setValidationMessage('Agents are non-destructible.');
  };

  const onAgentRefresh = async () => {
    setValidationMessage('');
    handleStatus(lastReceivedStatus);
  };

  return {
    onAgentCreate,
    onAgentDestroy,
    onAgentRefresh,
    validationMessage,
    agentStatus,
    agentHostingEnabled,
  };
};
