//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus, Power, HardDrive, Intersect } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { useAgentHostingProviderClient, useClient } from '@dxos/react-client';
import { useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { DensityProvider, useTranslation } from '@dxos/react-ui';
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
  const createInvitation = (e: React.MouseEvent) => {
    const testing = e.altKey && e.shiftKey;
    invitations.forEach((invitation) => invitation.cancel());
    // TODO(nf): allow user to make invitations non-persistent?
    const invitation = client.halo.share(
      testing ? { type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE } : undefined,
    );
    // TODO(wittjosiah): Don't depend on NODE_ENV.
    if (process.env.NODE_ENV !== 'production') {
      invitation.subscribe(onInvitationEvent);
    }
    send?.({ type: 'selectInvitation', invitation });
  };
  return (
    <IdentityActionChooserImpl
      {...props}
      onCreateInvitationClick={(e) => createInvitation(e)}
      agentHostingEnabled={!!agentHostingProviderClient}
    />
  );
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps & {
  onCreateInvitationClick?: (e: React.MouseEvent) => void;
};

export const IdentityActionChooserImpl = ({
  onCreateInvitationClick,
  active,
  send,
  agentHostingEnabled,
  devices,
}: IdentityActionChooserImplProps) => {
  const { t } = useTranslation('os');

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
          <Action
            disabled={!active}
            data-testid='devices-panel.create-invitation'
            onClick={onCreateInvitationClick}
            classNames='plb-4'
          >
            <Plus className={getSize(6)} />
            <span className='grow mli-3'>{t('choose add device label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
          <Action
            data-testid='devices-panel.join-new-identity'
            onClick={() => send?.({ type: 'chooseJoinNewIdentity' })}
            classNames='plb-4'
          >
            <Intersect className={getSize(6)} />
            <span className='grow mli-3'>{t('choose join new identity label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
          <Action
            data-testid='devices-panel.sign-out'
            onClick={() => send?.({ type: 'chooseResetStorage' })}
            classNames='plb-4'
          >
            <Power className={getSize(6)} />
            <span className='grow mli-3'>{t('choose sign out label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
          <DeviceList devices={devices} />
        </div>
      </DensityProvider>
    </div>
  );
};
