//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type CancellableInvitation } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useAgentHostingProviderClient, type Client } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

export const useAgentHandlers = ({
  client,
  invitations,
  identity,
}: {
  client: Client;
  invitations: CancellableInvitation[];
  identity: Identity | null;
}) => {
  const [validationMessage, setValidationMessage] = useState('');
  const [agentStatus, setAgentStatus] = useState('');
  const [agentActive, setAgentActive] = useState(false);
  const agentHostingProviderClient = useAgentHostingProviderClient(client.config, client.halo);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      // TODO(nf): if agent exists, subscribe to updates instead of oneshot status
      if (agentHostingProviderClient) {
        const agentStatus = await agentHostingProviderClient?.getAgent(identity?.identityKey.truncate() ?? 'foo');
        if (agentStatus) {
          setAgentActive(true);
          setAgentStatus(agentStatus);
        } else {
          setAgentActive(false);
          setValidationMessage('No agent deployed via provider.');
        }
      } else {
        setValidationMessage('No agent provider configured.');
      }
    };
    void fetchAgentStatus();
  }, []);

  const handleAgentCreate = useCallback(async (invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
      invariant(identity, 'Identity not found');
      if (agentHostingProviderClient) {
        try {
          const res = await agentHostingProviderClient?.createAgent(invitationCode, identity.identityKey.truncate());
          // TODO(nf): human-consumable response from API
          setAgentStatus(res);
          setAgentActive(true);
          setValidationMessage('');
        } catch (err: any) {
          setValidationMessage(`error creating agent: ${err.message}`);
        }
      }
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

  const onAgentDestroy = async () => {
    const identity = client.halo.identity.get();
    invariant(identity, 'Identity not found');
    try {
      await agentHostingProviderClient?.destroyAgent(identity.identityKey.truncate());
      setValidationMessage('No agent deployed via provider.');
      setAgentStatus('');
      setAgentActive(false);
    } catch (err: any) {
      setValidationMessage(`error destroying agent: ${err.message}`);
    }
  };

  return { onAgentCreate, onAgentDestroy, validationMessage, agentStatus, agentActive };
};
