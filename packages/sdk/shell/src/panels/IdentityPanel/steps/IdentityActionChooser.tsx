//
// Copyright 2023 DXOS.org
//

import { CaretRight, HardDrive } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { useAgentHostingProviderClient, useClient } from '@dxos/react-client';
import { useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { DensityProvider } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { Action, DeviceList } from '../../../components';
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

export type IdentityActionChooserImplProps = IdentityActionChooserProps & {
  onCreateInvitationClick?: () => void;
};

export const IdentityActionChooserImpl = ({
  onCreateInvitationClick,
  send,
  agentHostingEnabled,
  devices,
}: IdentityActionChooserImplProps) => {
  // const doneAction = (
  //   <PanelAction aria-label={t('done label')} onClick={onDone} disabled={!active} data-testid='identity-panel-done'>
  //     <Check weight='light' className={getSize(6)} />
  //   </PanelAction>
  // );
  return (
    <div role='none' className='grow flex flex-col gap-1'>
      <DensityProvider density='coarse'>
        <div className='grow justify-center flex flex-col gap-1'>
          {agentHostingEnabled && (
            <Action data-testid='manage-agent' onClick={() => send?.({ type: 'chooseAgent' })} classNames='plb-4'>
              <HardDrive className={getSize(6)} />
              <span className='grow mli-3'>Manage Agent</span>
              <CaretRight weight='bold' className={getSize(4)} />
            </Action>
          )}
          <DeviceList
            devices={devices}
            onClickAdd={onCreateInvitationClick}
            onClickJoinExisting={() => send?.({ type: 'chooseJoinNewIdentity' })}
            onClickReset={() => send?.({ type: 'chooseResetStorage' })}
          />
        </div>
      </DensityProvider>
    </div>
  );
};
