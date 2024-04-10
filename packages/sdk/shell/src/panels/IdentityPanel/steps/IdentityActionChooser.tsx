//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { useAgentHostingProviderClient, useClient } from '@dxos/react-client';
import { useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { AgentConfig, type AgentFormProps, DeviceList } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';

export type IdentityActionChooserProps = IdentityPanelStepProps;

export const IdentityActionChooser = (props: IdentityPanelStepProps) => {
  const { send } = props;
  const client = useClient();
  const invitations = useHaloInvitations();
  const agentHostingProviderClient = useAgentHostingProviderClient(client.config);
  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);
  const createInvitation = () => {
    invitations.forEach((invitation) => invitation.cancel());
    // TODO(nf): allow user to make invitations non-persistent?
    const invitation = client.halo.share();
    // TODO(wittjosiah): Don't depend on NODE_ENV.
    if (process.env.NODE_ENV !== 'production') {
      invitation.subscribe(onInvitationEvent);
    }
    send?.({ type: 'selectInvitation', invitation });
  };
  return (
    <IdentityActionChooserImpl
      {...props}
      onCreateInvitationClick={createInvitation}
      agentHostingEnabled={!!agentHostingProviderClient}
    />
  );
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps &
  Partial<AgentFormProps> & {
    onCreateInvitationClick?: () => void;
  };

export const IdentityActionChooserImpl = ({
  send,
  onCreateInvitationClick,
  devices,
  onAgentDestroy,
  onAgentCreate,
  agentStatus,
  agentActive,
  agentHostingEnabled,
}: IdentityActionChooserImplProps) => {
  return (
    <>
      <DeviceList
        devices={devices}
        onClickAdd={onCreateInvitationClick}
        onClickJoinExisting={() => send?.({ type: 'chooseJoinNewIdentity' })}
        onClickReset={() => send?.({ type: 'chooseResetStorage' })}
      />
      {agentHostingEnabled && <AgentConfig {...{ agentActive, agentStatus, onAgentDestroy, onAgentCreate }} />}
    </>
  );
};
