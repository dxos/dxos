//
// Copyright 2023 DXOS.org
//

import { CaretRight, Check, Plus, Power, UserGear } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useClient } from '@dxos/react-client';
import { useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { PanelAction, PanelActions } from '../../../components';
import { IdentityPanelStepProps } from '../IdentityPanelProps';

export const IdentityActionChooser = ({ send, active, onDone, doneActionParent }: IdentityPanelStepProps) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const invitations = useHaloInvitations();

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  const doneAction = (
    <PanelAction aria-label={t('done label')} onClick={onDone} disabled={!active} data-testid='identity-panel-done'>
      <Check weight='light' className={getSize(6)} />
    </PanelAction>
  );
  return (
    <div role='none' className='grow flex flex-col gap-1'>
      <DensityProvider density='coarse'>
        <div className='grow justify-center flex flex-col gap-1'>
          <Button
            disabled={!active}
            data-testid='devices-panel.create-invitation'
            onClick={() => {
              invitations.forEach((invitation) => invitation.cancel());
              const invitation = client.halo.createInvitation();
              // TODO(wittjosiah): Don't depend on NODE_ENV.
              if (process.env.NODE_ENV !== 'production') {
                invitation.subscribe(onInvitationEvent);
              }
              send({ type: 'selectInvitation', invitation });
            }}
            classNames='plb-4'
          >
            <Plus className={getSize(6)} />
            <span className='grow mli-3'>{t('choose devices label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled
            data-testid='manage-profile'
            onClick={() => {} /* send({ type: 'chooseProfile' }) */}
            classNames='plb-4'
          >
            <UserGear className={getSize(6)} />
            <span className='grow mli-3'>{t('choose profile label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled
            data-testid='sign-out'
            onClick={() => {} /* send({ type: 'chooseSignOut' }) */}
            classNames='plb-4'
          >
            <Power className={getSize(6)} />
            <span className='grow mli-3'>{t('choose sign out label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
        </div>
      </DensityProvider>
      <PanelActions>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</PanelActions>
    </div>
  );
};
