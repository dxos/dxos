//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check, Plus } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, Separator, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { useClient } from '@dxos/react-client';
import { useDevices, useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { DeviceList, InvitationList } from '../../../components';
import { IdentityPanelStepProps } from '../IdentityPanelProps';

export type DeviceManagerProps = IdentityPanelStepProps & {
  createInvitationUrl: (invitationCode: string) => string;
};

export const DeviceManager = ({ active, send, onDone, doneActionParent, createInvitationUrl }: DeviceManagerProps) => {
  const { t } = useTranslation('os');

  const client = useClient();
  const devices = useDevices();
  const invitations = useHaloInvitations();

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  const doneButton = (
    <Button onClick={onDone} disabled={!active} classNames='grow pli-2 order-1' data-testid='identity-panel-done'>
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return (
    <>
      <InvitationList
        invitations={invitations}
        onClickRemove={(invitation) => invitation.cancel()}
        createInvitationUrl={createInvitationUrl}
      />
      <div role='none' className='flex-1' />
      <Button
        disabled={!active}
        classNames='is-full flex gap-2 mbs-2'
        onClick={() => {
          const invitation = client.halo.createInvitation();
          // TODO(wittjosiah): Don't depend on NODE_ENV.
          if (process.env.NODE_ENV !== 'production') {
            invitation.subscribe(onInvitationEvent);
          }
        }}
        data-testid='devices-panel.create-invitation'
      >
        <Plus className={mx(getSize(4), 'invisible')} weight='bold' />
        <span className='grow'>{t('create device invitation label')}</span>
        <Plus className={getSize(4)} weight='bold' />
      </Button>
      <Separator classNames='mlb-3' />
      <DeviceList devices={devices} />
      <div className='flex gap-2 mbs-2'>
        {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
        <Button
          disabled={!active}
          onClick={() => send({ type: 'unchooseAction' })}
          classNames='flex items-center gap-2 pis-2 pie-4'
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </>
  );
};
