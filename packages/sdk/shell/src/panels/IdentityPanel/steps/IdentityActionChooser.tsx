//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useHaloInvitations, DeviceType } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { AgentConfig, type AgentFormProps, DeviceList } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';

export type IdentityActionChooserProps = IdentityPanelStepProps;

export const IdentityActionChooser = (props: IdentityPanelStepProps) => {
  const { send } = props;
  const client = useClient();
  const invitations = useHaloInvitations();
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
  return <IdentityActionChooserImpl {...props} onCreateInvitationClick={createInvitation} />;
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps &
  Partial<AgentFormProps> & {
    onCreateInvitationClick?: () => void;
  };

export const IdentityActionChooserImpl = ({
  send,
  onCreateInvitationClick,
  devices,
  connectionState,
  agentHostingEnabled,
  ...agentProps
}: IdentityActionChooserImplProps) => {
  const managedDeviceAvailable = devices.find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
  return (
    <div role='none' className='bs-40 grow overflow-y-auto overflow-x-hidden'>
      <DeviceList
        devices={devices}
        connectionState={connectionState}
        onClickAdd={onCreateInvitationClick}
        onClickJoinExisting={() => send?.({ type: 'chooseJoinNewIdentity' })}
        onClickReset={() => send?.({ type: 'chooseResetStorage' })}
        onAgentDestroy={agentProps.onAgentDestroy!}
      />
      {!managedDeviceAvailable && agentHostingEnabled && <AgentConfig {...(agentProps as AgentFormProps)} />}
    </div>
  );
};
