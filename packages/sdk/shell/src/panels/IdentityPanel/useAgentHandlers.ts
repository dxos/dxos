//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type CancellableInvitation } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useAgentHostingClient, useClient } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { type AgentFormProps } from '../../components';

export const useAgentHandlers = ({
  invitations,
  identity,
}: {
  invitations: CancellableInvitation[];
  identity: Identity | null;
}): AgentFormProps => {
  const [validationMessage, setValidationMessage] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentFormProps['agentStatus']>('getting');
  const agentHostingProviderClient = useAgentHostingClient();
  const client = useClient();

  const updateAgentStatus = async () => {
    // TODO(nf): if agent exists, subscribe to updates instead of oneshot status
    if (agentHostingProviderClient) {
      setAgentStatus('getting');
      try {
        const agentId = await agentHostingProviderClient?.getAgent(identity?.identityKey.truncate() ?? 'never');
        if (agentId) {
          setAgentStatus('created');
        } else {
          setAgentStatus('creatable');
        }
      } catch (err: any) {
        setAgentStatus('error');
        setValidationMessage(`Couldn’t check agent status: ${err.message}`);
      }
    } else {
      setAgentStatus('error');
      setValidationMessage('No agent provider configured.');
    }
  };

  const createAgent = async (invitationCode: string) => {
    invariant(identity, 'Identity not found');
    if (agentHostingProviderClient) {
      setAgentStatus('creating');
      setValidationMessage('');
      try {
        const agentId = await agentHostingProviderClient?.createAgent(invitationCode, identity.identityKey.truncate());
        if (agentId) {
          setAgentStatus('created');
        } else {
          setAgentStatus('creatable');
          setValidationMessage('Error creating agent.');
        }
      } catch (err: any) {
        setValidationMessage(`Error creating agent: ${err.message}`);
        return updateAgentStatus();
      }
    } else {
      setAgentStatus('error');
      setValidationMessage('No agent provider configured.');
    }
  };

  const destroyAgent = async () => {
    invariant(identity, 'Identity not found');
    if (agentHostingProviderClient) {
      setAgentStatus('destroying');
      setValidationMessage('');
      try {
        await agentHostingProviderClient?.destroyAgent(identity.identityKey.truncate());
        setAgentStatus('creatable');
      } catch (err: any) {
        setValidationMessage(`Error destroying agent: ${err.message}`);
        return updateAgentStatus();
      }
    } else {
      setAgentStatus('error');
      setValidationMessage('No agent provider configured.');
    }
  };

  useEffect(() => {
    void updateAgentStatus();
  }, []);

  const handleAgentCreate = useCallback(async (invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
      return createAgent(invitationCode);
    }
  }, []);

  const onAgentCreate = async () => {
    invitations.forEach((invitation) => invitation.cancel());

    // TODO(nf): do this work in the hosting provider client?
    const invitation = client.halo.share({
      type: Invitation.Type.INTERACTIVE,
      authMethod: Invitation.AuthMethod.NONE,
      multiUse: true,
    });

    invitation.subscribe(handleAgentCreate);
  };

  const onAgentRefresh = async () => {
    setValidationMessage('');
    await updateAgentStatus();
  };

  return {
    onAgentCreate,
    onAgentDestroy: destroyAgent,
    onAgentRefresh,
    validationMessage,
    agentStatus,
    agentHostingEnabled: !!agentHostingProviderClient,
  };
};
