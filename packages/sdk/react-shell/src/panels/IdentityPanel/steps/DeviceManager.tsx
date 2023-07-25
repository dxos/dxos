//
// Copyright 2023 DXOS.org
//

import { PlusSquare } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, Separator, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useClient } from '@dxos/react-client';
import { useDevices, useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { DeviceList, InvitationList } from '../../../components';

export type DeviceManagerProps = {
  createInvitationUrl: (invitationCode: string) => string;
};

export const DeviceManager = ({ createInvitationUrl }: DeviceManagerProps) => {
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

  return (
    <>
      <InvitationList
        invitations={invitations}
        onClickRemove={(invitation) => invitation.cancel()}
        createInvitationUrl={createInvitationUrl}
      />
      <Button
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
        <span>{t('create device invitation label')}</span>
        <PlusSquare className={getSize(4)} weight='bold' />
      </Button>
      <Separator />
      <DeviceList devices={devices} />
    </>
  );
};
