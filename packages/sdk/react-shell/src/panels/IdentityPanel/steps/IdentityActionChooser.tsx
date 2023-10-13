//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus, Power, UserGear } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useClient } from '@dxos/react-client';
import { useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { Action } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';

export type IdentityActionChooserProps = IdentityPanelStepProps;

export const IdentityActionChooser = (props: IdentityPanelStepProps) => {
  const { send } = props;
  const client = useClient();
  const invitations = useHaloInvitations();
  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);
  const createInvitation = () => {
    invitations.forEach((invitation) => invitation.cancel());
    const invitation = client.halo.share();
    // TODO(wittjosiah): Don't depend on NODE_ENV.
    if (process.env.NODE_ENV !== 'production') {
      invitation.subscribe(onInvitationEvent);
    }
    send?.({ type: 'selectInvitation', invitation });
  };
  return <IdentityActionChooserImpl {...props} onCreateInvitationClick={createInvitation} />;
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps & {
  onCreateInvitationClick?: () => void;
};

export const IdentityActionChooserImpl = ({
  onCreateInvitationClick,
  active,
  send,
  onDone,
  doneActionParent,
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
          <Action
            disabled={!active}
            data-testid='devices-panel.create-invitation'
            onClick={onCreateInvitationClick}
            classNames='plb-4'
          >
            <Plus className={getSize(6)} />
            <span className='grow mli-3'>{t('choose devices label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
          <Action data-testid='manage-profile' onClick={() => send?.({ type: 'chooseProfile' })} classNames='plb-4'>
            <UserGear className={getSize(6)} />
            <span className='grow mli-3'>{t('choose profile label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
          <Action
            disabled
            data-testid='sign-out'
            onClick={() => {} /* send({ type: 'chooseSignOut' }) */}
            classNames='plb-4'
          >
            <Power className={getSize(6)} />
            <span className='grow mli-3'>{t('choose sign out label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Action>
        </div>
      </DensityProvider>
      {/* <PanelActions>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</PanelActions> */}
    </div>
  );
};
