//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useHaloInvitations, DeviceType } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { AgentConfig, type AgentFormProps, DeviceList, type DeviceListProps } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';

export type IdentityActionChooserProps = IdentityPanelStepProps;

export const IdentityActionChooser = (props: IdentityPanelStepProps) => {
  const { send } = props;
  const client = useClient();
  const invitations = useHaloInvitations();
  const createInvitation = () => {
    invitations.forEach((invitation) => invitation.cancel());
    // TODO(nf): allow user to make invitations non-persistent?
    const invitation = client.halo.share();
    if (client.config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
      const subscription = invitation.subscribe((invitation: Invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        if (invitation.state === Invitation.State.CONNECTING) {
          log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
          subscription.unsubscribe();
        }
      });
    }
    send?.({ type: 'selectInvitation', invitation });
  };
  const isProduction = client.config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production';
  return (
    <IdentityActionChooserImpl
      {...props}
      onClickAdd={createInvitation}
      onClickJoinExisting={() => send?.({ type: 'chooseJoinNewIdentity' })}
      onClickRecover={isProduction ? undefined : () => send?.({ type: 'chooseRecoverIdentity' })}
      onClickReset={() => send?.({ type: 'chooseResetStorage' })}
    />
  );
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps &
  Partial<AgentFormProps> &
  Pick<DeviceListProps, 'onClickAdd' | 'onClickJoinExisting' | 'onClickRecover' | 'onClickReset'>;

export const IdentityActionChooserImpl = ({
  devices,
  connectionState,
  agentHostingEnabled,
  onClickAdd,
  onClickJoinExisting,
  onClickRecover,
  onClickReset,
  ...agentProps
}: IdentityActionChooserImplProps) => {
  const managedDeviceAvailable = devices.find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
  return (
    <div role='none' className='bs-40 grow overflow-y-auto overflow-x-hidden'>
      <DeviceList
        devices={devices}
        connectionState={connectionState}
        onClickAdd={onClickAdd}
        onClickJoinExisting={onClickJoinExisting}
        onClickRecover={agentProps.agentStatus === 'created' ? onClickRecover : undefined}
        onClickReset={onClickReset}
        onAgentDestroy={agentProps.onAgentDestroy!}
      />
      {!managedDeviceAvailable && agentHostingEnabled && <AgentConfig {...(agentProps as AgentFormProps)} />}
    </div>
  );
};
